from rest_framework import serializers
from .models import DiscordUser, Token, Session

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ['id', 'score', 'accuracy', 'avg_reaction_ms', 'duration', 'exercise', 'played_at']


class TokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Token
        fields = ['token']


class StatsSerializer(serializers.Serializer):
    # Last 5 sessions
    recent_sessions = SessionSerializer(many=True)
    
    # All time stats
    total_sessions = serializers.IntegerField()
    avg_score = serializers.FloatField()
    avg_accuracy = serializers.FloatField()
    avg_reaction_ms = serializers.FloatField()
    best_score = serializers.IntegerField()