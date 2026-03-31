# Auto corpus pull quotes — async jobs

Long-running “background research” jobs for Auto are **not** implemented. Pull-quote search runs **in the same request** as your message (fast enough for the published corpus index). If server timeouts ever become an issue, a future version could add a stored job row and polling.
