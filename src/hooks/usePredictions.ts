import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { Prediction } from '../types'

export function usePredictions(matchId: string, userId: string | undefined) {
  const [myPrediction, setMyPrediction] = useState<Prediction | null>(null)
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!matchId) return
    load()
  }, [matchId, userId])

  async function load() {
    setLoading(true)

    // Fetch all visible predictions for this match (RLS handles visibility)
    const { data } = await supabase
      .from('predictions')
      .select('*, profiles(username, nickname, total_points, is_bot, avatar), teams!pred_qualifier_id(name, name_he, crest_url)')
      .eq('match_id', matchId)

    const preds = data ?? []
    setAllPredictions(preds)
    setMyPrediction(preds.find(p => p.user_id === userId) ?? null)
    setLoading(false)
  }

  async function upsertPrediction(
    predScoreA: number,
    predScoreB: number,
    predQualifierId: string | null
  ): Promise<{ error: string | null }> {
    if (!userId) return { error: 'לא מחובר' }

    const { error } = await supabase.from('predictions').upsert(
      {
        user_id: userId,
        match_id: matchId,
        pred_score_a: predScoreA,
        pred_score_b: predScoreB,
        pred_qualifier_id: predQualifierId,
      },
      { onConflict: 'user_id,match_id' }
    )

    if (error) {
      if (error.code === '42501') return { error: 'הניחוש נעול — המשחק עומד להתחיל' }
      return { error: error.message }
    }

    await load()
    return { error: null }
  }

  return { myPrediction, allPredictions, loading, upsertPrediction, reload: load }
}
