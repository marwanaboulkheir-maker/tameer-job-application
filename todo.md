# TODO: Merge Personal Data Sections in PDF

## Task
Move Date of Birth, Marital Status, Gender, and Military Status fields INTO the "البيانات الشخصية" section in the PDF, and remove the separate "البيانات الإضافية" section.

## Steps

1. [x] Merge `additionalPersonalRows` fields (dateOfBirth, maritalStatus, gender, militaryStatus) into `personalRows` in `buildApplicantSummarySections` function
2. [x] Remove the "البيانات الإضافية" section from the sections array
3. [x] Verify the changes work correctly in the PDF output

## Current Structure
- personalRows: name, nationalId, phone, email, address, dateOfBirth, maritalStatus, gender, militaryStatus

## Target Structure (Complete)
- personalRows: name, nationalId, phone, email, address, dateOfBirth, maritalStatus, gender, militaryStatus
- Removed "البيانات الإضافية" section
