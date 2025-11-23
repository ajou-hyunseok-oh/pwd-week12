-- Todo 테이블 생성
CREATE TABLE todos (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- updated_at 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 설정
CREATE TRIGGER update_todos_updated_at 
  BEFORE UPDATE ON todos 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 CRUD 가능한 정책 (실습용)
CREATE POLICY "Enable all operations for all users" ON todos
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 샘플 데이터 추가
INSERT INTO todos (title, description, priority, due_date) VALUES
  ('수업 과제 제출', 'Supabase 실습 과제 완료하기', 'high', CURRENT_DATE + INTERVAL '3 days'),
  ('도서관 책 반납', '빌린 책 3권 반납하기', 'medium', CURRENT_DATE + INTERVAL '7 days'),
  ('운동하기', '헬스장 가기', 'low', CURRENT_DATE + INTERVAL '1 day');