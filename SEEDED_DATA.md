# Seeded Data Reference

This document lists the initial data seeded into the ProjectHub database. You can use these credentials to log in and test the application.

## Authentication Helper

**Default Passwords:**
- **Admins:** `AdminPass123!`
- **Supervisors:** `SupervisorPass123!`
- **Students:** `StudentPass123!`

---

## Admin Accounts

These accounts have full system access (User Role: `ADMIN`).

| Email | Name | Role |
|-------|------|------|
| `admin@ui.edu.ng` | System Administrator | System Admin |
| `superadmin@ui.edu.ng` | Super Administrator | Super Admin |
| `hod.cs@ui.edu.ng` | Prof. Adebayo Adeyemi | HOD Computer Science |

---

## Supervisor Accounts

These accounts can manage projects, students, and reviews (User Role: `SUPERVISOR`).

| Email | Name | Specializations | Office |
|-------|------|----------------|--------|
| `prof.adebayo@ui.edu.ng` | Prof. Adebayo Ogundimu | AI & ML, Data Science | Room 201 |
| `dr.olumide@ui.edu.ng` | Dr. Olumide Fasanya | Web Dev, Software Eng | Room 105 |
| `prof.kemi@ui.edu.ng` | Prof. Kemi Adeyemi | Cybersecurity, Network | Room 301 |
| `dr.tunde@ui.edu.ng` | Dr. Tunde Bakare | Mobile Apps, HCI | Room 203 |
| `prof.funmi@ui.edu.ng` | Prof. Funmilayo Oladele | Cloud, Database Systems | Room 102 |
| `dr.segun@ui.edu.ng` | Dr. Segun Afolabi | Data Science, AI | Room 205 |

---

## Student Accounts

These accounts can browse projects, bookmark them, and view their dashboard (User Role: `STUDENT`).

| Email | Name | Interests/Skills | Year |
|-------|------|------------------|------|
| `adunni.student@ui.edu.ng` | Adunni Olatunji | Web Dev, ML (JS, Python) | 4 |
| `kola.student@ui.edu.ng` | Kola Adebisi | Mobile Apps (Java, Kotlin) | 4 |
| `bola.student@ui.edu.ng` | Bola Ogundipe | Data Science (Python, SQL) | 4 |
| `yemi.student@ui.edu.ng` | Yemi Adesanya | Cybersecurity (Linux, Network) | 4 |
| `tolu.student@ui.edu.ng` | Tolu Bamidele | UI/UX (Flutter, Figma) | 4 |
| `dayo.student@ui.edu.ng` | Dayo Olaniyan | Cloud/DevOps (AWS, Docker) | 4 |
| `nike.student@ui.edu.ng` | Nike Adeyinka | Databases (PostgreSQL, SQL) | 4 |
| `femi.student@ui.edu.ng` | Femi Ogunleye | Full Stack (Vue, TypeScript) | 4 |

---

## Seeded Projects

Approximately 26 projects have been seeded across various Computer Science specializations. They are automatically assigned to supervisors with matching specializations.

**Specializations Covered:**
- Artificial Intelligence & Machine Learning (e.g., Performance Prediction, Essay Grading)
- Web Development & Full Stack (e.g., Course Platform, E-Commerce)
- Mobile Application Development (e.g., Campus Nav, Mental Health App)
- Cybersecurity & Information Security (e.g., Network Monitoring, Blockchain Creds)
- Data Science & Analytics (e.g., Enrollment Prediction, Sentiment Analysis)
- Cloud Computing & DevOps (e.g., Microservices, CI/CD Pipeline)
- Software Engineering & Architecture (e.g., Automated Code Review)
- Human-Computer Interaction (e.g., Accessible Learning, VR Campus Tour)
- Database Systems & Management (e.g., Distributed DB, NoSQL Store)
- Network Systems & Administration (e.g., SDN Implementation, VPN Solution)

**Note:** Projects are set to `approved` status by default in the seeder, making them visible to students immediately.

## Bookmark Categories

Default bookmark categories created for students:
- **Research**: For potential FYP topics.
- **Reading**: For literature review references.
- **Interesting**: General interest projects.
