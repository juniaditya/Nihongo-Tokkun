-- flashcard_states has no updated_at column; reviews maintain its snapshot.
DROP TRIGGER IF EXISTS trg_flashcard_states_updated_at
ON public.flashcard_states;
