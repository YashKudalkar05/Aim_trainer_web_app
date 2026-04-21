import discord
from discord import app_commands
from discord.ext import commands
import requests
import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
DJANGO_API_URL = os.getenv('DJANGO_API_URL')
SITE_URL = os.getenv('SITE_URL')

intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}')
    try:
        synced = await bot.tree.sync()
        print(f'Synced {len(synced)} commands')
    except Exception as e:
        print(f'Error syncing commands: {e}')


# ── /aimtrain ────────────────────────────────────────────────────────────────

@bot.tree.command(name='aimtrain', description='Get a link to start an aim training session')
async def aimtrain(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)

    try:
        res = requests.post(f'{DJANGO_API_URL}/token/', json={
            'discord_id': str(interaction.user.id),
            'username': str(interaction.user.name),
            'display_name': str(interaction.user.display_name),
            'avatar': str(interaction.user.avatar.key) if interaction.user.avatar else None,
        })

        if res.status_code != 201:
            await interaction.followup.send('Failed to generate session. Please try again.', ephemeral=True)
            return

        token = res.json()['token']
        link = f'{SITE_URL}?token={token}'

        embed = discord.Embed(
            title='🎯 Aim Training Session Ready',
            description=f'Click the link below to start your session.\nLink expires in **30 minutes**.',
            color=discord.Color.red()
        )
        embed.add_field(name='Start Training', value=f'[Click here to train]({link})', inline=False)
        embed.set_footer(text='Use /mystats to view your performance summary')

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(f'Something went wrong: {str(e)}', ephemeral=True)


# ── /mystats ─────────────────────────────────────────────────────────────────

@bot.tree.command(name='mystats', description='View your aim training summary or a specific exercise')
@app_commands.describe(exercise='Optional: flicking, tracking, or precision')
async def mystats(interaction: discord.Interaction, exercise: str = None):
    await interaction.response.defer(ephemeral=True)

    try:
        if exercise:
            exercise = exercise.lower().strip()
            valid = ['flicking', 'tracking', 'precision']
            if exercise not in valid:
                await interaction.followup.send(
                    f'Unknown exercise. Valid options: `flicking`, `tracking`, `precision`',
                    ephemeral=True
                )
                return
            await send_exercise_stats(interaction, exercise)
        else:
            await send_summary_stats(interaction)

    except Exception as e:
        await interaction.followup.send(f'Something went wrong: {str(e)}', ephemeral=True)


async def send_summary_stats(interaction: discord.Interaction):
    res = requests.get(f'{DJANGO_API_URL}/stats/{interaction.user.id}/')

    if res.status_code == 404:
        await interaction.followup.send(
            'No sessions found. Use `/aimtrain` to start training!',
            ephemeral=True
        )
        return

    if res.status_code != 200:
        await interaction.followup.send('Failed to fetch stats. Please try again.', ephemeral=True)
        return

    data = res.json()
    summary = data.get('summary', {})

    embed = discord.Embed(
        title=f'🎯 {interaction.user.name}\'s Aim Summary',
        description=f'**Total Sessions:** {data["total_sessions"]}\nUse `/mystats flicking`, `/mystats tracking`, or `/mystats precision` for details.',
        color=discord.Color.red()
    )

    if 'flicking' in summary:
        f = summary['flicking']
        embed.add_field(
            name='🔥 Flicking',
            value=(
                f'Sessions: {f["total_sessions"]}\n'
                f'Avg Score: {f["avg_score"]}\n'
                f'Best Score: {f["best_score"]}\n'
                f'Avg Accuracy: {f["avg_accuracy"]}%\n'
                f'Avg Reaction: {f["avg_reaction_ms"]}ms'
            ),
            inline=True
        )

    if 'tracking' in summary:
        t = summary['tracking']
        embed.add_field(
            name='📡 Tracking',
            value=(
                f'Sessions: {t["total_sessions"]}\n'
                f'Avg Score: {t["avg_score"]}\n'
                f'Best Score: {t["best_score"]}\n'
                f'Avg Time on Target: {t["avg_time_on_target"]}%'
            ),
            inline=True
        )

    if 'precision' in summary:
        p = summary['precision']
        embed.add_field(
            name='🎯 Precision',
            value=(
                f'Sessions: {p["total_sessions"]}\n'
                f'Avg Score: {p["avg_score"]}\n'
                f'Best Score: {p["best_score"]}'
            ),
            inline=True
        )

    if not summary:
        embed.add_field(
            name='No data yet',
            value='Use `/aimtrain` to start training!',
            inline=False
        )

    embed.set_footer(text='Use /mystats flicking, /mystats tracking, or /mystats precision for details')
    await interaction.followup.send(embed=embed, ephemeral=True)


async def send_exercise_stats(interaction: discord.Interaction, exercise: str):
    res = requests.get(f'{DJANGO_API_URL}/stats/{interaction.user.id}/{exercise}/')

    if res.status_code == 404:
        await interaction.followup.send(
            f'No {exercise} sessions found. Use `/aimtrain` to start training!',
            ephemeral=True
        )
        return

    if res.status_code != 200:
        await interaction.followup.send('Failed to fetch stats. Please try again.', ephemeral=True)
        return

    data = res.json()

    if exercise == 'flicking':
        embed = discord.Embed(
            title=f'🔥 {interaction.user.name}\'s Flicking Stats',
            color=discord.Color.red()
        )
        embed.add_field(
            name='📊 All Time',
            value=(
                f'**Sessions:** {data["total_sessions"]}\n'
                f'**Avg Score:** {data["avg_score"]}\n'
                f'**Best Score:** {data["best_score"]}\n'
                f'**Avg Accuracy:** {data["avg_accuracy"]}%\n'
                f'**Avg Reaction:** {data["avg_reaction_ms"]}ms'
            ),
            inline=False
        )
        if data.get('recent_sessions'):
            recent_text = ''
            for i, s in enumerate(data['recent_sessions']):
                recent_text += (
                    f'**{i+1}.** Score: {s["score"]} | '
                    f'Accuracy: {s["accuracy"]}% | '
                    f'Reaction: {s["avg_reaction_ms"]}ms | '
                    f'{s["duration"]}s\n'
                )
            embed.add_field(name='🕐 Last 5 Sessions', value=recent_text, inline=False)

    elif exercise == 'tracking':
        embed = discord.Embed(
            title=f'📡 {interaction.user.name}\'s Tracking Stats',
            color=discord.Color.red()
        )
        embed.add_field(
            name='📊 All Time',
            value=(
                f'**Sessions:** {data["total_sessions"]}\n'
                f'**Avg Score:** {data["avg_score"]}\n'
                f'**Best Score:** {data["best_score"]}\n'
                f'**Avg Time on Target:** {data["avg_time_on_target"]}%'
            ),
            inline=False
        )
        if data.get('recent_sessions'):
            recent_text = ''
            for i, s in enumerate(data['recent_sessions']):
                recent_text += (
                    f'**{i+1}.** Score: {s["tracking_score"]} | '
                    f'Time on Target: {s["time_on_target"]}% | '
                    f'{s["duration"]}s\n'
                )
            embed.add_field(name='🕐 Last 5 Sessions', value=recent_text, inline=False)

    elif exercise == 'precision':
        embed = discord.Embed(
            title=f'🎯 {interaction.user.name}\'s Precision Stats',
            color=discord.Color.red()
        )
        embed.add_field(
            name='📊 All Time',
            value=(
                f'**Sessions:** {data["total_sessions"]}\n'
                f'**Avg Score:** {data["avg_score"]}\n'
                f'**Best Score:** {data["best_score"]}'
            ),
            inline=False
        )

        # Breakdown by difficulty
        by_diff = data.get('by_difficulty', {})
        diff_text = ''
        for diff in ['easy', 'normal', 'hard']:
            d = by_diff.get(diff, {})
            if d.get('sessions', 0) > 0:
                diff_text += (
                    f'**{diff.capitalize()}** — '
                    f'Sessions: {d["sessions"]} | '
                    f'Avg: {d["avg"]} | '
                    f'Best: {d["best"]}\n'
                )
        if diff_text:
            embed.add_field(name='⚡ By Difficulty', value=diff_text, inline=False)

        if data.get('recent_sessions'):
            recent_text = ''
            for i, s in enumerate(data['recent_sessions']):
                recent_text += (
                    f'**{i+1}.** Score: {s["score"]} | '
                    f'Misses: {s["misses"]} | '
                    f'{s["difficulty"].capitalize()} | '
                    f'{s["duration"]}s\n'
                )
            embed.add_field(name='🕐 Last 5 Sessions', value=recent_text, inline=False)

    embed.set_footer(text='Use /aimtrain to start a new session')
    await interaction.followup.send(embed=embed, ephemeral=True)


bot.run(DISCORD_TOKEN)