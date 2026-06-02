from django.contrib import admin
from django.urls import path, include
from striker_app import views as app_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', app_views.register_view, name='register'),
    path('api/auth/login/', app_views.login_view, name='login'),
    path('api/auth/logout/', app_views.logout_view, name='logout'),
    path('api/auth/me/', app_views.me_view, name='me'),
    path('api/tasks/', app_views.tasks_view, name='tasks'),
    path('api/tasks/<int:task_id>/', app_views.task_detail_view, name='task_detail'),
    path('api/logs/', app_views.logs_view, name='logs'),
    path('api/calendar/', app_views.calendar_view, name='calendar'),
    path('api/streaks/', app_views.streaks_view, name='streaks'),
    path('api/day/<str:date>/', app_views.day_detail_view, name='day_detail'),
    path('', app_views.index_view, name='index'),
]
