from django.db import models
import uuid
from django.utils import timezone
from datetime import timedelta

class DiscordUser(models.Model):
    discord_id = models.CharField(max_length=100, unique=True)
    username = models.CharField(max_length=100)
    display_name = models.CharField(max_length=255, null=True, blank=True)
    avatar = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username


class Token(models.Model):
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    discord_user = models.ForeignKey(DiscordUser, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def is_valid(self):
        expiry = self.created_at + timedelta(minutes=30)
        return not self.used and timezone.now() < expiry

    def __str__(self):
        return f"{self.discord_user.username} - {self.token}"


class Session(models.Model):
    EXERCISE_CHOICES = [
        ('flicking', 'Flicking'),
        ('tracking', 'Tracking'),
        ('precision', 'Precision'),
    ]

    discord_user = models.ForeignKey(DiscordUser, on_delete=models.CASCADE)
    exercise = models.CharField(max_length=50, choices=EXERCISE_CHOICES)
    duration = models.IntegerField(null=True, blank=True)
    played_at = models.DateTimeField(auto_now_add=True)

    # Gridshot fields
    score = models.IntegerField(null=True, blank=True)
    accuracy = models.FloatField(null=True, blank=True)
    avg_reaction_ms = models.IntegerField(null=True, blank=True)

    # Tracking fields
    time_on_target = models.FloatField(null=True, blank=True)  # percentage 0-100
    tracking_score = models.FloatField(null=True, blank=True)  # sum of health reduced

    # Precision fields
    difficulty = models.CharField(max_length=10, null=True, blank=True)  # easy, normal, hard
    misses = models.IntegerField(null=True, blank=True)
    def __str__(self):
        return f"{self.discord_user.username} - {self.exercise} - {self.played_at}"