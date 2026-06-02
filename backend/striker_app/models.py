from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username


TASK_COLOR_CHOICES = [
    ('red', 'Red'),
    ('blue', 'Blue'),
    ('orange', 'Orange'),
    ('purple', 'Purple'),
    ('green', 'Green'),
    ('pink', 'Pink'),
    ('cyan', 'Cyan'),
    ('yellow', 'Yellow'),
]


class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    name = models.CharField(max_length=100)
    color_theme = models.CharField(max_length=20, choices=TASK_COLOR_CHOICES, default='blue')
    icon = models.CharField(max_length=10, default='🎯')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        unique_together = ['user', 'name']

    def __str__(self):
        return f"{self.user.username} - {self.name}"


class DailyLog(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='logs')
    logged_date = models.DateField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.task.name} - {self.logged_date}"
