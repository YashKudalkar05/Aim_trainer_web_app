from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Avg, Max, Count, Sum
from .models import DiscordUser, Token, Session
from .serializers import SessionSerializer
import uuid

@api_view(['POST'])
def generate_token(request):
    discord_id = request.data.get('discord_id')
    username = request.data.get('username')
    display_name = request.data.get('display_name')
    avatar = request.data.get('avatar')

    if not discord_id or not username:
        return Response({'error': 'discord_id and username are required'}, status=status.HTTP_400_BAD_REQUEST)

    user, created = DiscordUser.objects.get_or_create(
    discord_id=discord_id,
    defaults={
            'username': username,
            'display_name': display_name,
            'avatar': avatar
        }
    )

    # Update if changed
    if not created:
        updated = False
        if user.username != username:
            user.username = username
            updated = True
        if display_name and user.display_name != display_name:
            user.display_name = display_name
            updated = True
        if avatar and user.avatar != avatar:
            user.avatar = avatar
            updated = True
        if updated:
            user.save()
        
    token = Token.objects.create(discord_user=user)
    return Response({'token': str(token.token)}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def submit_session(request):
    token_str = request.data.get('token')

    if not token_str:
        return Response({'error': 'token is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        token = Token.objects.get(token=token_str)
    except Token.DoesNotExist:
        return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)

    if not token.is_valid():
        return Response({'error': 'Token expired or already used'}, status=status.HTTP_400_BAD_REQUEST)

    exercise = request.data.get('exercise', 'flicking')

    session_data = {
        'discord_user': token.discord_user,
        'exercise': exercise,
        'duration': request.data.get('duration', 30),
    }

    if exercise == 'flicking':
        session_data.update({
            'score': request.data.get('score', 0),
            'accuracy': request.data.get('accuracy', 0),
            'avg_reaction_ms': request.data.get('avgReactionMs', 0),
        })
    elif exercise == 'tracking':
        session_data.update({
            'tracking_score': request.data.get('trackingScore', 0),
            'time_on_target': request.data.get('timeOnTarget', 0),
        })
    elif exercise == 'precision':
        session_data.update({
            'score': request.data.get('score', 0),
            'misses': request.data.get('misses', 0),
            'difficulty': request.data.get('difficulty', 'normal'),
        })

    session = Session.objects.create(**session_data)

    token.used = True
    token.save()

    return Response(SessionSerializer(session).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def get_stats(request, discord_id):
    try:
        user = DiscordUser.objects.get(discord_id=discord_id)
    except DiscordUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    sessions = Session.objects.filter(discord_user=user)

    if not sessions.exists():
        return Response({'error': 'No sessions found'}, status=status.HTTP_404_NOT_FOUND)

    summary = {}

    flicking_sessions = sessions.filter(exercise='flicking')
    if flicking_sessions.exists():
        agg = flicking_sessions.aggregate(
            avg_score=Avg('score'),
            best_score=Max('score'),
            avg_accuracy=Avg('accuracy'),
            avg_reaction=Avg('avg_reaction_ms'),
            total=Count('id')
        )
        summary['flicking'] = {
            'total_sessions': agg['total'],
            'avg_score': round(agg['avg_score'] or 0, 1),
            'best_score': agg['best_score'] or 0,
            'avg_accuracy': round(agg['avg_accuracy'] or 0, 1),
            'avg_reaction_ms': round(agg['avg_reaction'] or 0, 1),
        }

    tracking_sessions = sessions.filter(exercise='tracking')
    if tracking_sessions.exists():
        agg = tracking_sessions.aggregate(
            avg_score=Avg('tracking_score'),
            best_score=Max('tracking_score'),
            avg_time_on_target=Avg('time_on_target'),
            total=Count('id')
        )
        summary['tracking'] = {
            'total_sessions': agg['total'],
            'avg_score': round(agg['avg_score'] or 0, 1),
            'best_score': round(agg['best_score'] or 0, 1),
            'avg_time_on_target': round(agg['avg_time_on_target'] or 0, 1),
        }

    precision_sessions = sessions.filter(exercise='precision')
    if precision_sessions.exists():
        agg = precision_sessions.aggregate(
            avg_score=Avg('score'),
            best_score=Max('score'),
            total=Count('id')
        )
        summary['precision'] = {
            'total_sessions': agg['total'],
            'avg_score': round(agg['avg_score'] or 0, 1),
            'best_score': agg['best_score'] or 0,
        }

    return Response({
        'total_sessions': sessions.count(),
        'summary': summary,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_stats_by_exercise(request, discord_id, exercise):
    try:
        user = DiscordUser.objects.get(discord_id=discord_id)
    except DiscordUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    sessions = Session.objects.filter(
        discord_user=user,
        exercise=exercise
    ).order_by('-played_at')

    if not sessions.exists():
        return Response({'error': f'No {exercise} sessions found'}, status=status.HTTP_404_NOT_FOUND)

    recent = sessions[:5]

    if exercise == 'flicking':
        agg = sessions.aggregate(
            avg_score=Avg('score'),
            best_score=Max('score'),
            avg_accuracy=Avg('accuracy'),
            avg_reaction=Avg('avg_reaction_ms'),
            total=Count('id')
        )
        return Response({
            'exercise': 'flicking',
            'total_sessions': agg['total'],
            'avg_score': round(agg['avg_score'] or 0, 1),
            'best_score': agg['best_score'] or 0,
            'avg_accuracy': round(agg['avg_accuracy'] or 0, 1),
            'avg_reaction_ms': round(agg['avg_reaction'] or 0, 1),
            'recent_sessions': [
                {
                    'score': s.score,
                    'accuracy': s.accuracy,
                    'avg_reaction_ms': s.avg_reaction_ms,
                    'duration': s.duration,
                    'played_at': s.played_at,
                } for s in recent
            ]
        }, status=status.HTTP_200_OK)

    elif exercise == 'tracking':
        agg = sessions.aggregate(
            avg_score=Avg('tracking_score'),
            best_score=Max('tracking_score'),
            avg_time_on_target=Avg('time_on_target'),
            total=Count('id')
        )
        return Response({
            'exercise': 'tracking',
            'total_sessions': agg['total'],
            'avg_score': round(agg['avg_score'] or 0, 1),
            'best_score': round(agg['best_score'] or 0, 1),
            'avg_time_on_target': round(agg['avg_time_on_target'] or 0, 1),
            'recent_sessions': [
                {
                    'tracking_score': s.tracking_score,
                    'time_on_target': s.time_on_target,
                    'duration': s.duration,
                    'played_at': s.played_at,
                } for s in recent
            ]
        }, status=status.HTTP_200_OK)

    elif exercise == 'precision':
        agg = sessions.aggregate(
            avg_score=Avg('score'),
            best_score=Max('score'),
            total=Count('id')
        )

        easy = sessions.filter(difficulty='easy').aggregate(
            avg=Avg('score'), best=Max('score'), total=Count('id')
        )
        normal = sessions.filter(difficulty='normal').aggregate(
            avg=Avg('score'), best=Max('score'), total=Count('id')
        )
        hard = sessions.filter(difficulty='hard').aggregate(
            avg=Avg('score'), best=Max('score'), total=Count('id')
        )

        return Response({
            'exercise': 'precision',
            'total_sessions': agg['total'],
            'avg_score': round(agg['avg_score'] or 0, 1),
            'best_score': agg['best_score'] or 0,
            'by_difficulty': {
                'easy':   {'avg': round(easy['avg'] or 0, 1),   'best': easy['best'] or 0,   'sessions': easy['total']},
                'normal': {'avg': round(normal['avg'] or 0, 1), 'best': normal['best'] or 0, 'sessions': normal['total']},
                'hard':   {'avg': round(hard['avg'] or 0, 1),   'best': hard['best'] or 0,   'sessions': hard['total']},
            },
            'recent_sessions': [
                {
                    'score': s.score,
                    'misses': s.misses,
                    'difficulty': s.difficulty,
                    'duration': s.duration,
                    'played_at': s.played_at,
                } for s in recent
            ]
        }, status=status.HTTP_200_OK)

    return Response({'error': 'Unknown exercise'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def refresh_token(request):
    old_token_str = request.data.get('old_token')

    try:
        old_token = Token.objects.get(token=old_token_str)
    except Token.DoesNotExist:
        return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)

    new_token = Token.objects.create(discord_user=old_token.discord_user)
    return Response({'token': str(new_token.token)}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def get_user_from_token(request):
    token_str = request.GET.get('token')
    print("DEBUG: token received ->", token_str)  # <-- check token received

    if not token_str:
        return Response({"error": "Token required"}, status=400)

    try:
        token = Token.objects.select_related('discord_user').get(token=token_str)
    except Token.DoesNotExist:
        print("DEBUG: Token not found")
        return Response({"error": "Invalid token"}, status=404)

    if not token.is_valid():
        print("DEBUG: Token invalid")
        return Response({"error": "Token expired"}, status=400)

    user = token.discord_user
    print("DEBUG: Discord user ->", user.discord_id, user.display_name, user.avatar)

    avatar_url = None
    if user.avatar:
        ext = "gif" if user.avatar.startswith("a_") else "png"
        avatar_url = f"https://cdn.discordapp.com/avatars/{user.discord_id}/{user.avatar}.{ext}"

    print("DEBUG: avatar_url ->", avatar_url)

    return Response({
        "display_name": user.display_name or user.username,
        "avatar": avatar_url
    })