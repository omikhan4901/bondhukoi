# Pre-Launch Audit List 🚀

Don't forget to address these items before the final Bondhu Koi release!

## 🔒 Security & Limits

- [ ] **Tighten Rate Limits**: In `backend/src/routes/locations.js`, reduce the boundary saving limits (`max: 50, timeWindow: '1 hour'`) back to production-safe values (e.g., `max: 3, timeWindow: '1 day'`) to prevent server abuse/spam.
- [ ] **Review Environment Variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the frontend and only exists on the backend.
- [ ] **Database Pruning Policy**: Verify the `pruneOldTransitions` chance-based cleanup in `locations.js` is frequent enough for production load.

## 📱 Frontend UX

- [ ] **Check Snapshot Quality**: Verify that the 300ms delay in `BoundaryEditorSheet.js` is sufficient on mid-range Android devices to capture a fully rendered map snapshot.
- [ ] **Permission Review**: Ensure `LocationStatusContext.js` handles "Always" vs "While In Use" permissions correctly across different Android versions.
