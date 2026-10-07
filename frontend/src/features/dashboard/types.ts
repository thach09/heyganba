export interface UserExp {
  totalExp: number;
  level: number;
  expIntoLevel: number;
  expForNextLevel: number;
  rankName: string;
  rankTier: number;
  config: {
    exerciseCorrect: number;
    srsSession: number;
    examBase: number;
  };
}
