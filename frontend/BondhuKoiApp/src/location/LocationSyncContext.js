import { createContext, useContext } from 'react';

/** `refresh({ force })`: take a reading now and update the OS zone watching. */
export const LocationSyncContext = createContext(async () => {});
export const useRefreshLocation = () => useContext(LocationSyncContext);
