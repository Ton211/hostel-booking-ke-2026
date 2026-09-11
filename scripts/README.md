# Seed Script

Database seeding script for the Hostel Management System.

## Prerequisites

1. **Node.js** (v16+ recommended)
2. **Firebase project** with Firestore enabled

## Setup

### 1. Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon (⚙️) → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **"Generate new private key"**
6. Save the downloaded file as `scripts/serviceAccount.json`

### 2. Install Dependencies

```bash
npm install firebase-admin
```

### 3. Run the Seed

```bash
node scripts/seed.js
```

## What Gets Created

| Collection       | Documents | Details                                    |
| ---------------- | --------- | ------------------------------------------ |
| `hostels`        | 1         | Main Hostel (active, mixed gender)         |
| `rooms`          | 11        | Rooms 1-7 (Female), Rooms 8-11 (Male)     |
| `beds`           | 44        | 4 beds per room (DOWN/UP/DOWN/UP)         |
| `accommodationTypes` | 2     | School Based (KSh 4,500), Regular (KSh 12,000) |
| `semesters`      | 1         | 2026 Semester 2 (OPEN)                     |
| `settings`       | 1         | General system settings                    |

### Room Details

| Room | Gender | Beds              |
| ---- | ------ | ----------------- |
| 1-7  | Female | 4 each (19 total) |
| 8-11 | Male   | 4 each (16 total) |

### Bed Layout Per Room

| Bed # | Position |
| ----- | -------- |
| 1     | DOWN     |
| 2     | UP       |
| 3     | DOWN     |
| 4     | UP       |

## Data Structure

### Booking References
- Format: `HOST-YYYY-XXXXX` (e.g., `HOST-2026-00001`)

### Booking Flow
1. Student submits booking request
2. System generates reservation (expires after 15 minutes)
3. Payment confirms the booking
4. Admin checks in the student

### Semester Dates
- **Booking Period:** 2026-07-01 to 2026-08-31
- **Semester Period:** 2026-09-01 to 2027-01-31
