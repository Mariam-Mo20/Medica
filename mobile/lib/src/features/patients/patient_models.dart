class Patient {
  final int id;
  final String firstName;
  final String lastName;
  final String? medicalRecordNumber;
  final String dateOfBirth;
  final String? gender;
  final String? phone;
  final String? email;
  final String? address;

  Patient({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.dateOfBirth,
    this.medicalRecordNumber,
    this.gender,
    this.phone,
    this.email,
    this.address,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory Patient.fromJson(Map<String, dynamic> json) {
    return Patient(
      id: json['id'] as int,
      firstName: (json['first_name'] ?? '') as String,
      lastName: (json['last_name'] ?? '') as String,
      dateOfBirth: (json['date_of_birth'] ?? '') as String,
      medicalRecordNumber: json['medical_record_number'] as String?,
      gender: json['gender'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
    );
  }
}

class MedicalRecord {
  final int id;
  final String? diagnosis;
  final String? symptoms;
  final String? visitNotes;
  final String createdAt;

  MedicalRecord({
    required this.id,
    this.diagnosis,
    this.symptoms,
    this.visitNotes,
    required this.createdAt,
  });

  factory MedicalRecord.fromJson(Map<String, dynamic> json) {
    return MedicalRecord(
      id: json['id'] as int,
      diagnosis: json['diagnosis'] as String?,
      symptoms: json['symptoms'] as String?,
      visitNotes: json['visit_notes'] as String?,
      createdAt: (json['created_at'] ?? '') as String,
    );
  }
}
