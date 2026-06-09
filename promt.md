# ⚽ Referee Match Management App — Project Concept

This application connects referees with the people who assign them matches.  
It supports multiple user roles, team management, match creation, and referee assignment.

---

## 👥 User Roles

### **1. Admin**
- Full access to the system
- Creates and manages teams
- Creates matches
- Assigns referees
- Can edit all data

### **2. Referee**
- Receives match assignments
- Can accept or decline a match
- Sees their upcoming and past matches
- Can view match details

### **3. Coach**
- Creates and manages their team
- Adds players (name, photo, birth date, etc.)
- Edits team information
- Sees matches involving their team

### **4. Player**
- Cannot register themselves
- Added by the coach or admin
- Has a profile with basic information

---

## 🏆 Main Features

### **1. Team Registration and Player Management**
- Coaches (and admins) can create teams
- Players are added with:
  - Name
  - Photo
  - Birth date
  - Position (optional)
  - Jersey number
- Opening a team shows all players and their details

---

### **2. Match Creation**
Admins can create matches with:
- Home team
- Away team
- Date and time
- Location
- Category (age group, league, etc.)
- Result (added after the match)
- Comments or notes

---

### **3. Assigning Referees**
Each match requires **three referees**:
- Chief Referee
- Assistant Referee 1
- Assistant Referee 2

Admins choose which referees to assign.

---

### **4. Referee Confirmation**
After being assigned:
- Referees receive a notification
- They can **accept** or **decline** the match
- If declined, the admin is notified to assign someone else

---

## ⭐ Additional Enhancements

### **Match History**
- Referees and coaches can view past matches, results, and stats

### **Referee Profiles**
- Number of matches officiated
- Categories they can referee
- Assignment history

### **Notifications**
- New match assignment
- Match updates
- Result added

### **Search and Filters**
- Search teams
- Search players
- Filter matches by date, category, or referee

---

This concept forms the foundation of a complete referee and match management system.

---

## TODO / Reminders

- Fix verify email after log out (email verification page shows after logout instead of login)
- Upgrade the agent (improve capabilities, add more tools)
- Add emails for matches (notify users via email when matches are created/updated)
