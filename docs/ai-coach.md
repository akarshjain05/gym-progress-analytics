# AI Coach Integration

IRONLOG features an intelligent "AI Coach" powered by the Google Gemini API. It acts as a personalized personal trainer, analyzing user data to provide actionable insights.

## Architecture

The integration lives primarily in `backend/coach.py`.

1. **Data Aggregation**: When a user requests advice, the backend pulls their recent data (workouts, weight logs, calorie logs, and stated goals).
2. **Prompt Engineering**: The data is heavily formatted into a structured context window. The system prompt instructs the AI to behave like a strict, concise, professional strength coach.
3. **API Call**: The prompt is sent securely to the `gemini-1.5-flash` model.
4. **Graceful Fallback**: If the Gemini API is down, rate-limited, or misconfigured, the backend catches the exception and returns a standardized, parseable JSON error (`{"detail": "..."}`) rather than a 500 stack trace. The frontend intercepts this and displays a friendly toast notification to the user.

## Capabilities

- **Volume Analysis**: The AI can detect if a user is overtraining or undertraining specific muscle groups based on their `LiftLog` history.
- **Nutritional Advice**: By correlating `CalorieLog` with `BodyWeightLog` and the user's `Goal`, the AI can recommend macro adjustments.
- **Form & Safety**: In the interactive chat (`/coach/chat`), users can ask specific questions about exercise execution.

## Configuration

To enable the AI Coach, you must provide a valid Gemini API key in the `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
```

If the key is missing or invalid, the `coach.py` router will cleanly abort requests and return an appropriate 500 error indicating the missing configuration, which the frontend handles gracefully.
