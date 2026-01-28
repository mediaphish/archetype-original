-- Update calculate_roi_winner to not require all votes to be used
-- Events can close without all votes being used, so ROI winner should be
-- based on net score among all checked-in attendees, not just those who used all votes

CREATE OR REPLACE FUNCTION calculate_roi_winner(event_id_param UUID)
RETURNS TABLE (
  winner_email TEXT,
  net_score INTEGER,
  upvote_ratio DECIMAL,
  total_votes INTEGER,
  check_in_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible_targets AS (
    SELECT DISTINCT
      a.user_email,
      a.check_in_time,
      COALESCE(SUM(CASE WHEN v.vote_value = 1 THEN 1 ELSE 0 END), 0)::INTEGER AS upvotes,
      COALESCE(SUM(CASE WHEN v.vote_value = -1 THEN 1 ELSE 0 END), 0)::INTEGER AS downvotes
    FROM operators_attendance a
    INNER JOIN operators_users u ON u.email = a.user_email
    LEFT JOIN operators_votes v ON v.event_id = a.event_id AND v.target_email = a.user_email
    WHERE a.event_id = event_id_param
      AND a.checked_in = true
      AND a.present_until_close = true
      AND a.marked_no_show = false
      AND u.owed_balance = 0
      AND (u.benched_until IS NULL OR u.benched_until < NOW())
      AND (u.roles && ARRAY['operator', 'candidate']::TEXT[])
    GROUP BY a.user_email, a.check_in_time
  ),
  ranked_targets AS (
    SELECT
      et.user_email,
      et.check_in_time,
      (et.upvotes - et.downvotes) AS net_score,
      CASE 
        WHEN (et.upvotes + et.downvotes) > 0 
        THEN (et.upvotes::DECIMAL / (et.upvotes + et.downvotes)::DECIMAL)
        ELSE 0::DECIMAL
      END AS upvote_ratio,
      (et.upvotes + et.downvotes) AS total_votes
    FROM eligible_targets et
    ORDER BY
      (et.upvotes - et.downvotes) DESC,  -- net_score DESC
      CASE 
        WHEN (et.upvotes + et.downvotes) > 0 
        THEN (et.upvotes::DECIMAL / (et.upvotes + et.downvotes)::DECIMAL)
        ELSE 0::DECIMAL
      END DESC,  -- upvote_ratio DESC
      (et.upvotes + et.downvotes) DESC,  -- total_votes DESC
      et.check_in_time ASC  -- earliest check-in
    LIMIT 1
  )
  SELECT
    rt.user_email,
    rt.net_score::INTEGER,
    rt.upvote_ratio,
    rt.total_votes::INTEGER,
    rt.check_in_time
  FROM ranked_targets rt;
END;
$$ LANGUAGE plpgsql;
