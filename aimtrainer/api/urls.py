from django.urls import path
from . import views

urlpatterns = [
    path('token/', views.generate_token),
    path('session/', views.submit_session),
    path('stats/<str:discord_id>/', views.get_stats),
    path('stats/<str:discord_id>/<str:exercise>/', views.get_stats_by_exercise),
    path('token/refresh/', views.refresh_token),
    path('user/', views.get_user_from_token),
]