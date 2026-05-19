export type MatchStage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL'
export type MatchStatus = 'SCHEDULED' | 'IN_PLAY' | 'FINISHED'

export interface Team {
  id: string
  name: string
  name_he: string | null
  crest_url: string | null
  external_id: number | null
}

export interface Player {
  id: string
  name: string
  team_id: string | null
  external_id: number | null
  teams?: Team
}

export interface Profile {
  id: string
  username: string
  total_points: number
  is_admin: boolean
  is_bot: boolean
}

export interface Match {
  id: string
  external_id: number | null
  team_a_id: string
  team_b_id: string
  start_time: string
  stage: MatchStage
  status: MatchStatus
  score_a: number | null
  score_b: number | null
  winner_id: string | null
  updated_at: string
  // Joined
  team_a?: Team
  team_b?: Team
  winner?: Team
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  pred_score_a: number | null
  pred_score_b: number | null
  pred_qualifier_id: string | null
  points_earned: number
  created_at: string
  updated_at: string
  // Joined
  profiles?: Profile
  teams?: Team
}

export interface GoldenBet {
  user_id: string
  winner_team_id: string | null
  top_scorer_id: string | null
  points_earned: number
  teams?: Team
  players?: Player
}
