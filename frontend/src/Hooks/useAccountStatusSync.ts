'use client';

import { useEffect, useState } from 'react';
import { subscribeToAccountStatusChanges } from '@/services/accountStatusEvents';

export default function useAccountStatusSync() {
  const [revision, setRevision] = useState(0);
  useEffect(
    () =>
      subscribeToAccountStatusChanges(() =>
        setRevision((current) => current + 1),
      ),
    [],
  );
  return revision;
}
