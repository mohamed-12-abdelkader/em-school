export type GradeStage = 'primary' | 'preparatory' | 'secondary';

export interface SchoolGradeRow {
  id: number;
  school_id: number;
  name: string;
  stage: GradeStage;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SchoolClassRow {
  id: number;
  grade_id: number;
  name: string;
  capacity: number | null;
  created_at: Date;
  updated_at: Date;
}
