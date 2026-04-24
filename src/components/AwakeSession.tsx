/**
 * Awake Session
 * 
 * The master orchestrator for the state-based alignment engine.
 * 
 * Flow:
 * 1. State Check-In (3 questions)
 * 2. Mode Selection (Flow / Alignment / Resonance)
 * 3. Mode-specific experience
 * 4. Session logged
 */

import { useState } from 'react';
import { StateCheckIn, type SessionState, type SessionMode } from './StateCheckIn';
import { FlowMode } from './FlowMode';
import { AlignmentRouting } from './AlignmentRouting';
import { ResonanceMode } from './ResonanceMode';
import type { UserData } from './OnboardingFlow';

interface AwakeSessionProps {
  userData: UserData;
  isOpen: boolean;
  onClose: () => void;
}

type SessionPhase = 'checkin' | 'mode' | 'complete';

export function AwakeSession({ userData, isOpen, onClose }: AwakeSessionProps) {
  const [phase, setPhase] = useState<SessionPhase>('checkin');
  const [currentSession, setCurrentSession] = useState<SessionState | null>(null);
  const [currentMode, setCurrentMode] = useState<SessionMode | null>(null);

  const handleCheckInComplete = (session: SessionState, mode: SessionMode) => {
    setCurrentSession(session);
    setCurrentMode(mode);
    setPhase('mode');
  };

  const handleModeComplete = () => {
    setPhase('complete');
    onClose();
    // Reset for next session
    setTimeout(() => {
      setPhase('checkin');
      setCurrentSession(null);
      setCurrentMode(null);
    }, 300);
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setTimeout(() => {
      setPhase('checkin');
      setCurrentSession(null);
      setCurrentMode(null);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* State Check-In */}
      {phase === 'checkin' && (
        <StateCheckIn
          userData={userData}
          isOpen={true}
          onClose={handleClose}
          onComplete={handleCheckInComplete}
        />
      )}

      {/* Flow Mode */}
      {phase === 'mode' && currentMode === 'flow' && currentSession && (
        <FlowMode
          userData={userData}
          session={currentSession}
          isOpen={true}
          onClose={handleClose}
          onComplete={handleModeComplete}
        />
      )}

      {/* Alignment Routing */}
      {phase === 'mode' && currentMode === 'alignment' && currentSession && (
        <AlignmentRouting
          userData={userData}
          session={currentSession}
          isOpen={true}
          onClose={handleClose}
          onComplete={handleModeComplete}
        />
      )}

      {/* Resonance Mode */}
      {phase === 'mode' && currentMode === 'resonance' && currentSession && (
        <ResonanceMode
          userData={userData}
          session={currentSession}
          isOpen={true}
          onClose={handleClose}
          onComplete={handleModeComplete}
        />
      )}
    </>
  );
}
