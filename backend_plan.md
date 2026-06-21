# Backend Plan — Mobility Coach

**Date:** 2026-06-21  
**Status:** Planning Phase

---

## What a Backend Would Enable

### Data Persistence & Sync
- Cloud backup of workouts, streaks, and progress (currently local storage only)
- Cross-device sync (log on phone, view on web dashboard)
- Account-based data instead of device-specific
- Persistent user accounts with JWT authentication

### Social & Accountability
- Friend leaderboards (who has the highest pull-up record, most BJJ classes)
- Workout feed / activity stream
- Achievements and badges system
- Coach/trainer coaching dashboard to monitor athlete progress

### Advanced Analytics
- Historical trend analysis (monthly/yearly progression reports)
- Prediction engine for next milestone dates
- Recovery pattern detection across users (AI learns when you recover fastest)
- Injury risk scoring based on overtraining patterns

### Wearable Integration
- Persistent Apple Health / Garmin sync (currently mock only)
- Automatic sleep/HRV data population
- Real-time recovery recommendations based on live biometric data

### API for Third Parties
- Integrate with training platforms (Strava, TrainHeroic, etc.)
- Export workout data to coaching platforms

---

## How to Get Online (Step by Step)

### Phase 1: Minimal Viable Backend (2–3 weeks)

#### Tech Stack Decision
**Recommended: Python FastAPI + PostgreSQL**
- Matches your existing skillset (PPC DS background)
- Lightweight, fast, built-in async support
- PostgreSQL: industry standard, free tier available

Alternative: Node.js + Express (if you prefer JavaScript)

#### 1. Pick Your Hosting
| Platform | Cost | Deployment | DB |
|----------|------|------------|-----|
| **Fly.io** (recommended) | $5/month | Docker | Neon PostgreSQL ($5/month) |
| Railway | $5 credit/month | Git push | Postgres included |
| Vercel + Supabase | Free tier + $25/month | Git push | PostgreSQL + Auth |

**Recommendation:** Fly.io + Neon (simplest, cheapest, auto-scaling)

#### 2. Essential API Endpoints

```
POST   /auth/register       → create user account
POST   /auth/login          → return JWT token
POST   /auth/refresh        → refresh expired token

POST   /api/workouts        → save workout to DB
GET    /api/workouts        → list user's workouts (paginated)
GET    /api/workouts/{id}   → get specific workout

GET    /api/progress        → aggregate stats (PRs, streaks, avatar)
GET    /api/health          → Apple Health sync status

GET    /api/health-check    → service status
```

#### 3. Wire Frontend to Backend
- Replace all localStorage calls with HTTP requests
- Add offline fallback (queue requests if no connection)
- Add JWT token refresh logic
- Handle network errors gracefully

#### 4. Deploy
```bash
# Fly.io deployment
fly launch                    # creates fly.toml
fly deploy                    # pushes to cloud
fly scale count 1 -a app-name # reduce to 1 instance ($5/mo)
```

### Phase 2: Polish (1–2 weeks)
- Add image CDN (Cloudinary free tier) for exercise/avatar images
- Rate limiting + request validation
- Refresh token rotation
- User profile management endpoint
- Settings/preferences endpoint

### Phase 3: Scale (optional)
- Real-time sync via WebSocket (socket.io or FastAPI WebSockets)
- Proper error handling + monitoring (Sentry free tier)
- Load testing with k6 or Locust
- Analytics tracking (PostHog free tier)

---

## Graphics & Images Strategy

Asset paths are ready in code, but images don't exist yet. Priority order:

### High Priority (Launch Blockers)

#### 1. Exercise Images (12 total)
**Path:** `/public/exercises/{name}.webp`

Exercises to generate:
- pushups, pull_ups, dips, australian_pullups
- plank, hollow_body, lsit, dragon_flag
- pike_pushups, tuck_lsit, pistol_squat
- wall_run (or similar mobility example)

**Generation Options:**
- **Midjourney** (best results): $15 total for batch
  - Prompt template: `"Athletic calisthenics athlete performing [exercise], side view, clear form demonstration, minimal white background, professional sports photography, 4k"`
- **DALL-E 3**: $0.04–0.10 per image
- **Stable Diffusion** (local): Free if you have GPU

**Storage:** Upload to **Cloudinary** (free tier: 10GB, CDN delivery)
- Free tier never expires, includes transformations (resize, quality optimization)
- Generate URLs: `cloudinary.com/{user}/image/upload/w_400,q_auto/exercises/{name}.webp`

#### 2. Avatar Tier Images (4 total)
**Path:** `/public/avatar/{tier}.webp`

Tiers:
- `novice.webp` — beginner calisthenics athlete (opacity 0.5)
- `developing.webp` — intermediate build (opacity 0.7)
- `strong.webp` — advanced physique (opacity 0.9)
- `elite.webp` — elite athlete (opacity 1.0)

**Generation:**
- Midjourney: 4 images, $5
- Prompt: `"Professional fitness influencer at [tier] level, calisthenics athlete, dramatic lighting, minimalist background, portrait, editorial style"`

**Alternative (More Polished):**
- Use **Rive** (free tier) to create animated state machine
- Export as `.rive` file, embed in component with `@rive-app/react-webgl` (already supports Capacitor)
- Tier progression triggers animation

### Medium Priority (Nice to Have)

#### 3. App Icon & Splash Screen
- 192x192 (mobile home screen)
- 512x512 (PWA/app store)
- Splash screen: 2048x2048

**Generation:**
- Figma template ($0, use community template)
- or Midjourney: `"Minimalist app icon for calisthenics training app, icon style, single color, flat design, 512x512"`

#### 4. Muscle Map Visualization
Currently: text-based ("Chest, Shoulders trained today")

**Option A (SVG):** 
- Find open-source anatomy SVG on GitHub
- Highlight trained muscles in gold, untrained in grey
- Add to MuscleGroupsDisplay component

**Option B (Generated):**
- Midjourney: `"Anatomical human body diagram, muscle groups highlighted in gold, flat design, minimal"`
- Use as background image in component

---

## Image Generation Workflow

### Using Midjourney ($15 to launch)

1. **Join Midjourney** (free trial or $10/month)
2. **Create prompt template:**
   ```
   /imagine [base prompt] --ar 16:9 --quality 2 --v 6
   ```
3. **Generate all 16 images** (4 exercises × 4 angles, then pick best)
4. **Download at 4x resolution** (right-click on image)
5. **Optimize & upload to Cloudinary**
   ```bash
   # Reduce file size while keeping quality
   ffmpeg -i input.png -vf "scale=400:-1" -quality 85 output.webp
   ```

### Using Local Stable Diffusion (Free)

```bash
# Install Stable Diffusion via ComfyUI or WebUI
# Download model: `deliberate-v2.safetensors`
# Run locally on GPU

# Example: Generate exercise images batch
python batch_generate.py \
  --prompt "Calisthenics athlete pushup form" \
  --output /public/exercises/pushups.webp
```

---

## Implementation Roadmap

### Week 1: Backend Setup
- [ ] Create FastAPI project scaffold
- [ ] Set up PostgreSQL schema (users, workouts, progress)
- [ ] Implement auth endpoints (register, login, refresh)
- [ ] Deploy to Fly.io
- [ ] Test with Postman/curl

### Week 2: Frontend Integration
- [ ] Replace localStorage with API calls
- [ ] Add JWT token management
- [ ] Implement offline queue (if no connection)
- [ ] Test end-to-end on real device
- [ ] Handle auth errors + re-login flow

### Week 3: Graphics
- [ ] Generate 16 exercise images (Midjourney)
- [ ] Generate 4 avatar tier images
- [ ] Upload to Cloudinary
- [ ] Update ExerciseCard.tsx image paths
- [ ] Update AvatarDisplay.tsx with tier images
- [ ] Test on all screen sizes

### Pre-Launch Checklist
- [ ] All endpoints tested + documented
- [ ] Images load on slow connections (lazy load)
- [ ] Error messages are user-friendly
- [ ] SSL/HTTPS working (Fly.io auto-enables)
- [ ] Rate limiting active (prevent abuse)
- [ ] User can delete account (GDPR)

---

## Cost Breakdown

| Service | Cost | Duration |
|---------|------|----------|
| Fly.io | $5/month | Production server |
| Neon PostgreSQL | $5/month | Cloud database |
| Cloudinary (free) | $0 | Image CDN |
| Midjourney | $15 one-time | 16 images generated |
| Domain (optional) | $12/year | Custom domain |
| **Total** | **$25/month** | **ongoing** |

**First month:** $25 (setup + images)  
**Ongoing:** $10/month (server + DB)

---

## Next Steps

**Choose one:**

1. **Start backend this week**
   - I can scaffold FastAPI + PostgreSQL setup
   - Create Dockerfile + Fly.io config
   - Walk through first deploy

2. **Generate images first**
   - Get visual polish done
   - Have assets ready when backend launches
   - Can integrate immediately once API is live

3. **Both in parallel**
   - You generate images (can do standalone)
   - I scaffold backend
   - Merge them together in week 2

**My recommendation:** Start with images (1–2 days, unblocks design confidence), then backend (scalable, launches the MVP).

---

## Reference Links

- **Fly.io Docs:** https://fly.io/docs/
- **FastAPI Tutorial:** https://fastapi.tiangolo.com/tutorial/
- **PostgreSQL Neon:** https://neon.tech/
- **Cloudinary Upload Widget:** https://cloudinary.com/documentation/upload_widget
- **Rive Animations:** https://rive.app/ (alternative to static avatar images)

---

## Questions to Clarify

1. Do you want to monetize (premium features, ads) or keep it free?
2. Do you need user authentication or one-user app?
3. Interested in social features (leaderboards, friend tracking) or solo tracking?
4. Timeline: launch MVP in 2 weeks? 1 month?

**Once you decide, let me know and we'll dive into code.**
