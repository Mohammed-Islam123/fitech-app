// src/hooks/useNFCScanner.js

import { useEffect, useState, useCallback, useRef } from 'react';
import nfcScanner from '../services/nfcScanner';
import { api } from '../services/api';

export function useNFCScanner(options = {}) {
  const [isListening, setIsListening] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanStatus, setScanStatus] = useState({ 
    loading: false, 
    error: null, 
    success: false, 
    data: null 
  });
  const [processingQueue, setProcessingQueue] = useState([]);
  const isProcessing = useRef(false);

  const processCardScan = useCallback(async (cardUid) => {
    setScanStatus({ loading: true, error: null, success: false, data: null });
    
    try {
      const result = await api.scanEntryExit(cardUid);
      
      setScanStatus({ 
        loading: false, 
        error: null, 
        success: true, 
        data: result 
      });
      
      setLastScan({ uid: cardUid, result, timestamp: new Date() });
      options.onSuccess?.(cardUid, result);
      
      setTimeout(() => {
        setScanStatus(prev => ({ ...prev, success: false }));
      }, 3000);
      
      return result;
    } catch (error) {
      console.error('Error processing card scan:', error);
      
      let errorMessage = error.message || 'Failed to process card scan';
      
      if (error.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to scan cards.';
      } else if (error.status === 404) {
        errorMessage = 'Member not found. Please check the card.';
      } else if (error.status === 400) {
        errorMessage = error.payload?.message || error.payload?.detail || 'Invalid card or member status.';
      }
      
      setScanStatus({ 
        loading: false, 
        error: errorMessage, 
        success: false, 
        data: null 
      });
      
      options.onError?.(cardUid, error);
      
      setTimeout(() => {
        setScanStatus(prev => ({ ...prev, error: null }));
      }, 5000);
      
      throw error;
    }
  }, [options]);

  const handleScan = useCallback((cardUid) => {
    console.log('📇 Card scanned:', cardUid);
    setProcessingQueue(prev => [...prev, cardUid]);
    options.onScan?.(cardUid);
  }, [options]);

  // Process queue items one at a time via effect to avoid stale-closure
  // infinite loops. Each item is removed after success OR failure so
  // unregistered cards are never retried.
  useEffect(() => {
    if (processingQueue.length === 0 || isProcessing.current) return;

    isProcessing.current = true;
    const cardUid = processingQueue[0];

    processCardScan(cardUid)
      .catch(() => {
        // Errors already handled in processCardScan (status, callbacks, logs)
      })
      .finally(() => {
        setProcessingQueue(prev => prev.slice(1));
        isProcessing.current = false;
      });
  }, [processingQueue, processCardScan]);

  const startListening = useCallback(() => {
    if (!nfcScanner.isActive()) {
      nfcScanner.start({
        onScan: handleScan,
        onError: options.onError || null,
        onStatusChange: setIsListening
      });
    }
  }, [handleScan, options.onError]);

  const stopListening = useCallback(() => {
    if (nfcScanner.isActive()) {
      nfcScanner.stop();
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    const isDev = import.meta.env?.MODE === 'development' || process.env?.NODE_ENV === 'development';
    nfcScanner.init({ 
      debug: isDev,
      timeout: 300 
    });
    
    if (options.autoStart) {
      startListening();
    }
    
    return () => {
      stopListening();
    };
    // Only re-run when autoStart toggles — startListening/stopListening 
    // are unstable (they depend on options which changes every render), 
    // which would cause the scanner to restart on every provider re-render,
    // defeating manual pause/resume (e.g. from AddMemberModal).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.autoStart]);

  const simulateScan = useCallback((cardUid) => {
    nfcScanner.simulateScan(cardUid);
  }, []);

  const manualScan = useCallback(async (cardUid) => {
    return processCardScan(cardUid);
  }, [processCardScan]);

  return {
    isListening,
    lastScan,
    scanStatus,
    startListening,
    stopListening,
    simulateScan,
    manualScan,
    isActive: nfcScanner.isActive.bind(nfcScanner)
  };
}