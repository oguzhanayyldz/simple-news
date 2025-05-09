import { useRef, useState, useCallback } from 'react';

export default function useAutoSave(saveCallback, delay = 3000) {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const timeoutRef = useRef(null);
    
    const trigger = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                await saveCallback();
                setLastSaved(new Date());
            } catch (error) {
                console.error('Auto-save error:', error);
            } finally {
                setIsSaving(false);
            }
        }, delay);
    }, [saveCallback, delay]);
    
    const saveNow = useCallback(async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        
        setIsSaving(true);
        try {
            await saveCallback();
            setLastSaved(new Date());
        } catch (error) {
            console.error('Save error:', error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [saveCallback]);
    
    return {
        trigger,
        saveNow,
        isSaving,
        lastSaved
    };
}