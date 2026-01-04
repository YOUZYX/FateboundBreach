
/**
 * GameAudio - Connects Game State to Synthesizer
 * 
 * Listens to Zustand store updates and triggers procedural SFX.
 * Renders null (no UI).
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Synthesizer } from '../../core/audio/Synthesizer';

export function GameAudio() {
    // Connect to store
    const isMuted = useGameStore(s => s.isMuted);
    const masterVolume = useGameStore(s => s.masterVolume);
    const hoveredPacketId = useGameStore(s => s.hoveredPacketId);
    const selectedPacketIds = useGameStore(s => s.selectedPacketIds);
    const damageEvents = useGameStore(s => s.damageEvents);
    const gameResult = useGameStore(s => s.gameResult);
    const pendingAssignments = useGameStore(s => s.pendingAssignments);
    const isExecuting = useGameStore(s => s.isExecuting);
    const packetQueue = useGameStore(s => s.packetQueue);

    // Refs to track previous values to trigger effects only on CHANGE
    const prevSelectedCount = useRef(0);
    const prevDamageCount = useRef(0);
    const prevAssignmentCount = useRef(0);
    const prevIsExecuting = useRef(false);
    const ambiencePlaying = useRef(false);

    const synth = Synthesizer.getInstance();

    // Init Synth
    useEffect(() => {
        synth.init();

        // Resume context on first click
        const resumeAudio = () => synth.resume();
        window.addEventListener('click', resumeAudio);
        return () => window.removeEventListener('click', resumeAudio);
    }, []);

    // Play ambience when game loads (only if not muted)
    useEffect(() => {
        if (!isMuted && !ambiencePlaying.current) {
            // Small delay to ensure audio files are loaded
            setTimeout(() => {
                synth.playAmbience();
                ambiencePlaying.current = true;
            }, 1000);
        }

        return () => {
            synth.stopAmbience();
            ambiencePlaying.current = false;
        };
    }, []);

    // Stop ambience when muted
    useEffect(() => {
        if (isMuted && ambiencePlaying.current) {
            synth.stopAmbience();
            ambiencePlaying.current = false;
        } else if (!isMuted && !ambiencePlaying.current) {
            synth.playAmbience();
            ambiencePlaying.current = true;
        }
    }, [isMuted]);

    // Update Master Volume
    useEffect(() => {
        synth.setMasterVolume(masterVolume);
    }, [masterVolume]);

    // Hover Effect
    useEffect(() => {
        if (!isMuted && hoveredPacketId) {
            synth.playHover();
        }
    }, [hoveredPacketId, isMuted]);

    // Click/Select Effect
    useEffect(() => {
        const count = selectedPacketIds.length;
        if (count > prevSelectedCount.current) {
            if (!isMuted) synth.playClick();
        }
        prevSelectedCount.current = count;
    }, [selectedPacketIds, isMuted]);

    // IMMEDIATE ASSIGNMENT FEEDBACK - Play sound when card is matched with grid item
    useEffect(() => {
        const count = pendingAssignments.length;

        if (count > prevAssignmentCount.current && !isMuted) {
            // New assignment was made - get the latest assignment
            const latestAssignment = pendingAssignments[count - 1];

            // Find the packet to determine its type
            const packet = packetQueue.find(p => p.id === latestAssignment.packetId);

            if (packet) {
                // Play appropriate sound based on packet type
                switch (packet.type) {
                    case 'ATTACK':
                        synth.playAttack(); // Laser swoosh
                        break;
                    case 'DEFEND':
                        synth.playShield(); // Power-up sound
                        break;
                    case 'CRIT':
                        synth.playCrit(); // Impact sound
                        break;
                    case 'HEAL':
                        synth.playShield(); // Use shield sound for heal
                        break;
                    case 'MISS':
                        synth.playError(); // Error sound for miss
                        break;
                }
            }
        }

        prevAssignmentCount.current = count;
    }, [pendingAssignments, packetQueue, isMuted]);

    // Execute Sound - Play when turn execution starts
    useEffect(() => {
        if (isExecuting && !prevIsExecuting.current && !isMuted) {
            synth.playExecuteSound();
        }
        prevIsExecuting.current = isExecuting;
    }, [isExecuting, isMuted]);

    // Damage/Action Effects (keep for any additional effects during execution)
    useEffect(() => {
        if (damageEvents.length > prevDamageCount.current) {
            // Get the new events
            const newEvents = damageEvents.slice(prevDamageCount.current);

            newEvents.forEach(evt => {
                if (isMuted) return;

                // Stagger sounds slightly if multiple happen at once
                setTimeout(() => {
                    if (evt.type === 'shield') {
                        synth.playShield();
                    } else if (evt.type === 'damage' || evt.type === 'miss') {
                        if (evt.amount > 10) {
                            synth.playCrit();
                        } else {
                            synth.playAttack();
                        }
                    } else {
                        synth.playError();
                    }
                }, 100);
            });
        }
        prevDamageCount.current = damageEvents.length;
    }, [damageEvents, isMuted]);

    // Victory
    useEffect(() => {
        if (!isMuted && gameResult === 'VICTORY') {
            synth.playVictory();
        }
    }, [gameResult, isMuted]);

    return null;
}
