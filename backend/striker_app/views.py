import json
from datetime import date, timedelta
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render
from django.db.models import Count
from django.db import IntegrityError
from .models import Profile, Task, DailyLog


def index_view(request):
    return render(request, 'index.html', {
        'STATIC_URL': '/static/',
    })


def json_response(data, status=200):
    return JsonResponse(data, status=status)


def error_response(message, status=400):
    return JsonResponse({'error': message}, status=status)


def require_auth(func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return error_response('Authentication required', 401)
        return func(request, *args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


@csrf_exempt
@require_http_methods(["POST"])
def register_view(request):
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return error_response('Username and password are required')

        if User.objects.filter(username=username).exists():
            return error_response('Username already taken')

        if email and User.objects.filter(email=email).exists():
            return error_response('Email already in use')

        user = User.objects.create_user(username=username, email=email, password=password)
        Profile.objects.create(user=user)

        login(request, user)

        return json_response({
            'success': True,
            'user': {'id': user.id, 'username': user.username, 'email': user.email}
        }, 201)
    except json.JSONDecodeError:
        return error_response('Invalid JSON')
    except Exception as e:
        return error_response(str(e), 500)


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')

        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return json_response({
                'success': True,
                'user': {'id': user.id, 'username': user.username, 'email': user.email}
            })
        return error_response('Invalid credentials', 401)
    except json.JSONDecodeError:
        return error_response('Invalid JSON')


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return json_response({'success': True})


@require_http_methods(["GET"])
def me_view(request):
    if not request.user.is_authenticated:
        return error_response('Not authenticated', 401)
    user = request.user
    return json_response({'user': {'id': user.id, 'username': user.username, 'email': user.email}})


@csrf_exempt
@require_auth
def tasks_view(request):
    if request.method == 'GET':
        tasks = Task.objects.filter(user=request.user, is_active=True)
        data = [
            {
                'id': t.id,
                'name': t.name,
                'color_theme': t.color_theme,
                'icon': t.icon,
                'created_at': t.created_at.isoformat()
            }
            for t in tasks
        ]
        return json_response({'tasks': data})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name', '').strip()
            color_theme = data.get('color_theme', 'blue')
            icon = data.get('icon', '🎯')

            if not name:
                return error_response('Task name is required')

            task = Task.objects.filter(user=request.user, name=name).first()
            if task:
                if task.is_active:
                    return error_response('Task with this name already exists')
                else:
                    task.is_active = True
                    task.color_theme = color_theme
                    task.icon = icon
                    task.save()
            else:
                task = Task.objects.create(
                    user=request.user,
                    name=name,
                    color_theme=color_theme,
                    icon=icon
                )
            
            return json_response({
                'id': task.id,
                'name': task.name,
                'color_theme': task.color_theme,
                'icon': task.icon,
                'created_at': task.created_at.isoformat()
            }, 201)
        except json.JSONDecodeError:
            return error_response('Invalid JSON')


@csrf_exempt
@require_auth
def task_detail_view(request, task_id):
    try:
        task = Task.objects.get(id=task_id, user=request.user)
    except Task.DoesNotExist:
        return error_response('Task not found', 404)

    if request.method == 'DELETE':
        task.is_active = False
        task.save()
        return json_response({'success': True})

    elif request.method == 'PATCH':
        try:
            data = json.loads(request.body)
            if 'name' in data:
                task.name = data['name'].strip()
            if 'color_theme' in data:
                task.color_theme = data['color_theme']
            if 'icon' in data:
                task.icon = data['icon']
            task.save()
            return json_response({'success': True, 'id': task.id, 'name': task.name})
        except json.JSONDecodeError:
            return error_response('Invalid JSON')


@csrf_exempt
@require_auth
def logs_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            task_id = data.get('task_id')
            message = data.get('message', '').strip()
            log_date_str = data.get('date', str(date.today()))

            if not task_id or not message:
                return error_response('task_id and message are required')

            task = Task.objects.get(id=task_id, user=request.user, is_active=True)
            log_date = date.fromisoformat(log_date_str)

            log = DailyLog.objects.create(
                task=task,
                user=request.user,
                logged_date=log_date,
                message=message
            )
            return json_response({
                'id': log.id,
                'task_id': task.id,
                'task_name': task.name,
                'message': log.message,
                'date': str(log.logged_date),
                'created_at': log.created_at.isoformat()
            }, 201)
        except Task.DoesNotExist:
            return error_response('Task not found', 404)
        except ValueError:
            return error_response('Invalid date format. Use YYYY-MM-DD')
        except json.JSONDecodeError:
            return error_response('Invalid JSON')

    elif request.method == 'GET':
        logs = DailyLog.objects.filter(user=request.user).select_related('task')[:50]
        data = [
            {
                'id': l.id,
                'task_id': l.task.id,
                'task_name': l.task.name,
                'task_color': l.task.color_theme,
                'message': l.message,
                'date': str(l.logged_date),
                'created_at': l.created_at.isoformat()
            }
            for l in logs
        ]
        return json_response({'logs': data})


@require_auth
def calendar_view(request):
    today = date.today()
    start_date = today - timedelta(days=364)

    # Get all logs in range
    logs = DailyLog.objects.filter(
        user=request.user,
        logged_date__gte=start_date,
        logged_date__lte=today
    ).select_related('task')

    # Build day-by-day mapping
    day_map = {}
    for log in logs:
        d = str(log.logged_date)
        if d not in day_map:
            day_map[d] = {'tasks': set(), 'total_logs': 0, 'entries': []}
        day_map[d]['tasks'].add(log.task.id)
        day_map[d]['total_logs'] += 1
        day_map[d]['entries'].append({
            'task_name': log.task.name,
            'task_color': log.task.color_theme,
            'task_icon': log.task.icon,
            'message': log.message
        })

    calendar_data = {}
    for d_str, info in day_map.items():
        calendar_data[d_str] = {
            'unique_tasks': len(info['tasks']),
            'total_logs': info['total_logs'],
            'entries': info['entries']
        }

    return json_response({'calendar': calendar_data, 'today': str(today)})


@require_auth
def streaks_view(request):
    today = date.today()

    # Get all active days
    active_days = set(
        DailyLog.objects.filter(user=request.user)
        .values_list('logged_date', flat=True)
        .distinct()
    )

    # Current streak
    current_streak = 0
    check_date = today
    while check_date in active_days:
        current_streak += 1
        check_date -= timedelta(days=1)

    # If today has no log, check if yesterday starts the streak
    if today not in active_days:
        check_date = today - timedelta(days=1)
        while check_date in active_days:
            current_streak += 1
            check_date -= timedelta(days=1)

    # Longest streak
    longest_streak = 0
    temp_streak = 0
    if active_days:
        sorted_days = sorted(active_days)
        temp_streak = 1
        for i in range(1, len(sorted_days)):
            if (sorted_days[i] - sorted_days[i - 1]).days == 1:
                temp_streak += 1
            else:
                longest_streak = max(longest_streak, temp_streak)
                temp_streak = 1
        longest_streak = max(longest_streak, temp_streak)

    # Total active days in the last 30 days
    thirty_days_ago = today - timedelta(days=30)
    last_30_active = sum(
        1 for d in active_days if thirty_days_ago <= d <= today
    )
    consistency = round((last_30_active / 30) * 100)

    return json_response({
        'current_streak': current_streak,
        'longest_streak': longest_streak,
        'total_active_days': len(active_days),
        'consistency_30d': consistency
    })


@require_auth
def day_detail_view(request, date):
    try:
        log_date = date
        logs = DailyLog.objects.filter(
            user=request.user,
            logged_date=log_date
        ).select_related('task')

        data = [
            {
                'id': l.id,
                'task_id': l.task.id,
                'task_name': l.task.name,
                'task_color': l.task.color_theme,
                'task_icon': l.task.icon,
                'message': l.message,
                'created_at': l.created_at.isoformat()
            }
            for l in logs
        ]
        return json_response({'date': log_date, 'logs': data})
    except Exception as e:
        return error_response(str(e), 500)
