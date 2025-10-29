# UEAB SAMS API Documentation for External Applications

## Overview
This document provides comprehensive information for external applications integrating with the UEAB Student and Academic Management System (SAMS) API.

**Base URL:** `https://studedatademo.azurewebsites.net` (Production)  
**Base URL:** `http://localhost:4000` (Development)  
**API Version:** 1.0.0  
**Documentation:** `/api-docs` (Interactive Swagger UI)

---

## Authentication
Currently, the API is open for development purposes. Authentication will be added in future versions.

---

## Get Student by Student ID

### Endpoint
```
GET /api/students/by-student-id/{studentId}
```

### Description
Retrieve comprehensive information about a specific student using their unique studentId. This is the primary endpoint for external applications to fetch student data.

### Parameters
| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| studentId | string | path | Yes | Unique student identifier (e.g., student001, student002) |

### Request Example

**cURL:**
```bash
curl -X GET "https://studedatademo.azurewebsites.net/api/students/by-student-id/student001" \
  -H "Accept: application/json"
```

**JavaScript/Node.js:**
```javascript
const response = await fetch('https://studedatademo.azurewebsites.net/api/students/by-student-id/student001');
const student = await response.json();
console.log(student);
```

**Python:**
```python
import requests

response = requests.get('https://studedatademo.azurewebsites.net/api/students/by-student-id/student001')
student = response.json()
print(student)
```

**PHP:**
```php
<?php
$url = 'https://studedatademo.azurewebsites.net/api/students/by-student-id/student001';
$response = file_get_contents($url);
$student = json_decode($response, true);
print_r($student);
?>
```

### Response Schema

#### Success Response (200 OK)
```json
{
  "id": 1,
  "studentId": "student001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@ueab.ac.ke",
  "phone": "+254712345678",
  "gender": "male",
  "dateOfBirth": "2000-05-15",
  "schoolId": 1,
  "departmentId": 1,
  "yearOfStudy": 3,
  "semester": 1,
  "enrollmentStatus": "active",
  "enrollments": [
    {
      "id": 1,
      "studentId": 1,
      "courseId": 101,
      "semester": 1,
      "academicYear": "2024-2025",
      "enrollmentDate": "2024-09-01",
      "grade": "A",
      "status": "active"
    }
  ],
  "fees": [
    {
      "id": 1,
      "studentId": 1,
      "semester": 1,
      "academicYear": "2024-2025",
      "amountBilled": 50000,
      "amountPaid": 30000,
      "paymentDate": "2024-09-15",
      "dueDate": "2024-12-31",
      "status": "partial"
    }
  ],
  "residence": {
    "id": 1,
    "studentId": 1,
    "residenceStatus": "on-campus",
    "hostelId": 1,
    "roomId": 101,
    "bedNumber": "A1",
    "checkInDate": "2024-09-01"
  },
  "balance": 20000
}
```

#### Error Response (404 Not Found)
```json
{
  "error": "Student not found"
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "error": "Internal server error"
}
```

### Response Fields

#### Student Information
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Internal database ID |
| studentId | string | Unique student identifier (use this for lookups) |
| firstName | string | Student's first name |
| lastName | string | Student's last name |
| email | string | Student's email address |
| phone | string | Student's phone number |
| gender | string | Gender: "male" or "female" |
| dateOfBirth | string | Date of birth (YYYY-MM-DD format) |
| schoolId | integer | ID of the school the student belongs to |
| departmentId | integer | ID of the department |
| yearOfStudy | integer | Current year of study (1-4) |
| semester | integer | Current semester (1 or 2) |
| enrollmentStatus | string | Status: "active", "suspended", "graduated", "withdrawn" |

#### Enrollments Array
Contains all course enrollments for the student.

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Enrollment ID |
| courseId | integer | ID of the enrolled course |
| semester | integer | Semester of enrollment |
| academicYear | string | Academic year (e.g., "2024-2025") |
| grade | string \| null | Final grade if available |
| status | string | Enrollment status |

#### Fees Array
Contains all fee payment records for the student.

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Fee record ID |
| semester | integer | Fee semester |
| academicYear | string | Academic year |
| amountBilled | number | Total amount billed |
| amountPaid | number | Amount paid so far |
| paymentDate | string \| null | Date of last payment |
| dueDate | string | Payment due date |
| status | string | "paid", "partial", or "pending" |

#### Residence Object
Contains hostel and room assignment information (null if off-campus).

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Residence record ID |
| residenceStatus | string | "on-campus" or "off-campus" |
| hostelId | integer \| null | ID of assigned hostel |
| roomId | integer \| null | ID of assigned room |
| bedNumber | string \| null | Bed assignment (e.g., "A1") |
| checkInDate | string \| null | Check-in date |

#### Balance
| Field | Type | Description |
|-------|------|-------------|
| balance | number | Total outstanding balance (amountBilled - amountPaid across all fees) |

---

## Common Use Cases

### 1. Student Portal Login
Use this endpoint to retrieve student information after authentication:
```javascript
async function loadStudentDashboard(studentId) {
  const student = await fetch(`/api/students/by-student-id/${studentId}`).then(r => r.json());
  
  // Display student info
  console.log(`Welcome ${student.firstName} ${student.lastName}`);
  
  // Show balance
  console.log(`Outstanding Balance: KES ${student.balance}`);
  
  // List courses
  student.enrollments.forEach(enrollment => {
    console.log(`Course ID: ${enrollment.courseId}`);
  });
}
```

### 2. Library System Integration
Verify student status before issuing books:
```python
import requests

def verify_student_for_library(student_id):
    response = requests.get(f'http://localhost:4000/api/students/by-student-id/{student_id}')
    
    if response.status_code == 404:
        return {"allowed": False, "reason": "Student not found"}
    
    student = response.json()
    
    if student['enrollmentStatus'] != 'active':
        return {"allowed": False, "reason": "Student not active"}
    
    if student['balance'] > 50000:  # Block if balance > 50k
        return {"allowed": False, "reason": "Outstanding fees"}
    
    return {
        "allowed": True, 
        "name": f"{student['firstName']} {student['lastName']}",
        "department": student['departmentId']
    }
```

### 3. Hostel Management Integration
Get student's room assignment:
```javascript
async function getStudentHostelInfo(studentId) {
  const student = await fetch(`/api/students/by-student-id/${studentId}`).then(r => r.json());
  
  if (!student.residence || student.residence.residenceStatus === 'off-campus') {
    return { status: 'off-campus' };
  }
  
  return {
    status: 'on-campus',
    hostelId: student.residence.hostelId,
    roomId: student.residence.roomId,
    bedNumber: student.residence.bedNumber
  };
}
```

### 4. Fee Payment Integration
Check outstanding balance before payment:
```php
<?php
function getStudentBalance($studentId) {
    $url = "http://localhost:4000/api/students/by-student-id/$studentId";
    $response = file_get_contents($url);
    $student = json_decode($response, true);
    
    return [
        'balance' => $student['balance'],
        'fees' => $student['fees'],
        'name' => $student['firstName'] . ' ' . $student['lastName']
    ];
}
?>
```

---

## Additional API Endpoints

For a complete list of all available endpoints, visit the interactive API documentation:

**Swagger UI:** `http://localhost:4000/api-docs`

### Other Student Endpoints
- `GET /api/students` - List all students (with filters)
- `GET /api/students/{id}` - Get student by internal ID
- `POST /api/students` - Create new student
- `PUT /api/students/{id}` - Update student information
- `DELETE /api/students/{id}` - Delete student

### Related Endpoints
- `GET /api/courses` - List all courses
- `GET /api/hostels` - List all hostels
- `GET /api/fees` - List fee records
- `GET /api/appointments` - List appointments
- `GET /api/schools` - List schools
- `GET /api/departments` - List departments

---

## Error Handling

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success - Request completed successfully |
| 404 | Not Found - Student with provided studentId doesn't exist |
| 500 | Internal Server Error - Server encountered an error |

### Best Practices
1. Always check the HTTP status code before parsing the response
2. Handle 404 errors gracefully (student not found)
3. Implement retry logic for 500 errors
4. Cache responses when appropriate to reduce API calls

### Example Error Handling (JavaScript)
```javascript
async function getStudentSafely(studentId) {
  try {
    const response = await fetch(`/api/students/by-student-id/${studentId}`);
    
    if (response.status === 404) {
      return { error: 'Student not found', studentId };
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch student:', error);
    return { error: 'Network error', details: error.message };
  }
}
```

---

## Rate Limiting
Currently, there are no rate limits. This may change in production.

---

## Support
For API support or questions:
- **Swagger Documentation:** `http://localhost:4000/api-docs`
- **GitHub Issues:** [Report issues here]
- **Email:** support@ueab.ac.ke

---

## Changelog

### Version 1.0.0 (October 28, 2025)
- Added `GET /api/students/by-student-id/{studentId}` endpoint
- Returns comprehensive student data including enrollments, fees, and residence
- Calculates outstanding balance automatically
- Full Swagger documentation added

---

## Example Integration Projects

### Mobile App (React Native)
```javascript
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

const StudentProfile = ({ studentId }) => {
  const [student, setStudent] = useState(null);
  
  useEffect(() => {
    fetch(`https://studedatademo.azurewebsites.net/api/students/by-student-id/${studentId}`)
      .then(res => res.json())
      .then(data => setStudent(data));
  }, [studentId]);
  
  if (!student) return <Text>Loading...</Text>;
  
  return (
    <View>
      <Text>{student.firstName} {student.lastName}</Text>
      <Text>Balance: KES {student.balance}</Text>
      <Text>Year: {student.yearOfStudy}</Text>
    </View>
  );
};
```

### Desktop App (Electron)
```javascript
const { app, BrowserWindow } = require('electron');
const fetch = require('node-fetch');

async function loadStudentData(studentId) {
  const response = await fetch(`http://localhost:4000/api/students/by-student-id/${studentId}`);
  return await response.json();
}

app.whenReady().then(async () => {
  const student = await loadStudentData('student001');
  console.log(student);
});
```

---

**Last Updated:** October 28, 2025
