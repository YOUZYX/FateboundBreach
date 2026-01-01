/**
 * VRF Mapper Unit Tests
 * 
 * Tests the deterministic byte-to-packet mapping logic.
 */

import { describe, it, expect } from 'vitest';
import {
    mapByteToPacketType,
    mapByteToPacket,
    calculatePacketCount,
    derivePacketsFromSeed,
    hexToBytes,
} from './vrfMapper';

describe('mapByteToPacketType', () => {
    // MISS: 0-19
    it('should map byte 0 to MISS', () => {
        expect(mapByteToPacketType(0)).toBe('MISS');
    });

    it('should map byte 19 to MISS', () => {
        expect(mapByteToPacketType(19)).toBe('MISS');
    });

    // ATTACK: 20-150
    it('should map byte 20 to ATTACK', () => {
        expect(mapByteToPacketType(20)).toBe('ATTACK');
    });

    it('should map byte 150 to ATTACK', () => {
        expect(mapByteToPacketType(150)).toBe('ATTACK');
    });

    // DEFEND: 151-200
    it('should map byte 151 to DEFEND', () => {
        expect(mapByteToPacketType(151)).toBe('DEFEND');
    });

    it('should map byte 200 to DEFEND', () => {
        expect(mapByteToPacketType(200)).toBe('DEFEND');
    });

    // CRIT: 201-240
    it('should map byte 201 to CRIT', () => {
        expect(mapByteToPacketType(201)).toBe('CRIT');
    });

    it('should map byte 240 to CRIT', () => {
        expect(mapByteToPacketType(240)).toBe('CRIT');
    });

    // HEAL: 241-255
    it('should map byte 241 to HEAL', () => {
        expect(mapByteToPacketType(241)).toBe('HEAL');
    });

    it('should map byte 255 to HEAL', () => {
        expect(mapByteToPacketType(255)).toBe('HEAL');
    });

    // Invalid bytes
    it('should throw for byte < 0', () => {
        expect(() => mapByteToPacketType(-1)).toThrow();
    });

    it('should throw for byte > 255', () => {
        expect(() => mapByteToPacketType(256)).toThrow();
    });
});

describe('mapByteToPacket', () => {
    it('should create MISS packet with value 0', () => {
        const packet = mapByteToPacket(0, 0);
        expect(packet.type).toBe('MISS');
        expect(packet.value).toBe(0);
        expect(packet.hexValue).toBe('0x00');
        expect(packet.id).toBe('packet-0');
    });

    it('should create ATTACK packet with value 5', () => {
        const packet = mapByteToPacket(100, 1);
        expect(packet.type).toBe('ATTACK');
        expect(packet.value).toBe(5);
        expect(packet.hexValue).toBe('0x64');
    });

    it('should create DEFEND packet with value 5', () => {
        const packet = mapByteToPacket(175, 2);
        expect(packet.type).toBe('DEFEND');
        expect(packet.value).toBe(5);
    });

    it('should create CRIT packet with value 15', () => {
        const packet = mapByteToPacket(220, 3);
        expect(packet.type).toBe('CRIT');
        expect(packet.value).toBe(15);
    });

    it('should create HEAL packet with value 10', () => {
        const packet = mapByteToPacket(250, 4);
        expect(packet.type).toBe('HEAL');
        expect(packet.value).toBe(10);
    });
});

describe('calculatePacketCount', () => {
    it('should return 6 for turn 1 (5 + 1%3)', () => {
        expect(calculatePacketCount(1)).toBe(6);
    });

    it('should return 7 for turn 2 (5 + 2%3)', () => {
        expect(calculatePacketCount(2)).toBe(7);
    });

    it('should return 5 for turn 3 (5 + 3%3)', () => {
        expect(calculatePacketCount(3)).toBe(5);
    });

    it('should return 6 for turn 4 (5 + 4%3)', () => {
        expect(calculatePacketCount(4)).toBe(6);
    });

    it('should throw for turn < 1', () => {
        expect(() => calculatePacketCount(0)).toThrow();
    });
});

describe('hexToBytes', () => {
    it('should convert hex string to bytes', () => {
        const bytes = hexToBytes('0xFF00AB');
        expect(bytes).toEqual(new Uint8Array([255, 0, 171]));
    });

    it('should handle hex without 0x prefix', () => {
        const bytes = hexToBytes('FF00');
        expect(bytes).toEqual(new Uint8Array([255, 0]));
    });

    it('should throw for invalid hex', () => {
        expect(() => hexToBytes('0xGG')).toThrow();
    });
});

describe('derivePacketsFromSeed (Determinism)', () => {
    const testSeed = '0x8f2a1b3c4d5e6f708192a3b4c5d6e7f80011223344556677889900aabbccddeeff';

    it('should return consistent packets for same seed and turn', () => {
        const packets1 = derivePacketsFromSeed(testSeed, 1);
        const packets2 = derivePacketsFromSeed(testSeed, 1);

        expect(packets1).toEqual(packets2);
    });

    it('should return correct packet count for each turn', () => {
        expect(derivePacketsFromSeed(testSeed, 1).packets.length).toBe(6);
        expect(derivePacketsFromSeed(testSeed, 2).packets.length).toBe(7);
        expect(derivePacketsFromSeed(testSeed, 3).packets.length).toBe(5);
    });

    it('should return different packets for different turns', () => {
        const packets1 = derivePacketsFromSeed(testSeed, 1);
        const packets2 = derivePacketsFromSeed(testSeed, 2);

        // They should not be equal (different turn seeds)
        expect(packets1.packets[0].hexValue).not.toEqual(packets2.packets[0].hexValue);
    });

    it('should return different packets for different seeds', () => {
        const seed2 = '0x0000000000000000000000000000000000000000000000000000000000000001';
        const packets1 = derivePacketsFromSeed(testSeed, 1);
        const packets2 = derivePacketsFromSeed(seed2, 1);

        expect(packets1).not.toEqual(packets2);
    });
});
