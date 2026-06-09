@echo off
echo ============================================
echo Deploy Match Notification Edge Function
echo ============================================
echo.
echo Before running this, get your Supabase access token:
echo 1. Go to https://supabase.com/dashboard/account/tokens
echo 2. Click "Generate New Token"
echo 3. Copy the token
echo.
set /p TOKEN="Enter your Supabase access token: "
echo.
echo Deploying function...
npx supabase login --token %TOKEN%
npx supabase link --project-ref nujbsrqgpaloumuciwbo
npx supabase functions deploy send-match-notification
echo.
echo ============================================
echo Set environment variables in Supabase Dashboard:
echo 1. Go to Edge Functions -> send-match-notification
echo 2. Add:
echo    - RESEND_API_KEY (get at resend.com)
echo    - FROM_EMAIL (e.g. noreply@yourdomain.com)
echo    - SITE_URL (your app URL)
echo ============================================
pause
