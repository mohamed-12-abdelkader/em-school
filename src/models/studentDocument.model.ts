import pool from '../db/pool';

export type StudentDocumentType = 'avatar' | 'birth_certificate' | 'document';

export async function insert(input: {
  studentId: number;
  fileUrl: string;
  fileType: StudentDocumentType;
}): Promise<void> {
  await pool.query(
    `INSERT INTO student_documents (student_id, file_url, file_type) VALUES ($1, $2, $3)`,
    [input.studentId, input.fileUrl, input.fileType],
  );
}
