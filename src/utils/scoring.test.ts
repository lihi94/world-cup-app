import { describe, it, expect } from 'vitest'
import { calculatePoints } from './scoring'

// Critical: exact score must return TOTAL points, not direction+exact cumulative.

describe('calculatePoints — GROUP stage', () => {
  it('exact score returns 3, not 5', () => {
    expect(calculatePoints(2, 1, null, 2, 1, null, 'GROUP')).toBe(3)
  })
  it('correct direction (win) returns 2', () => {
    expect(calculatePoints(2, 0, null, 3, 1, null, 'GROUP')).toBe(2)
  })
  it('correct direction (draw) returns 2', () => {
    expect(calculatePoints(1, 1, null, 2, 2, null, 'GROUP')).toBe(2)
  })
  it('wrong direction returns 0', () => {
    expect(calculatePoints(0, 1, null, 2, 0, null, 'GROUP')).toBe(0)
  })
  it('wrong direction (predicted draw, actual win) returns 0', () => {
    expect(calculatePoints(1, 1, null, 2, 1, null, 'GROUP')).toBe(0)
  })
})

describe('calculatePoints — R16/QF/SF', () => {
  it('exact score returns 4', () => {
    expect(calculatePoints(1, 0, null, 1, 0, null, 'R16')).toBe(4)
  })
  it('correct direction returns 3', () => {
    expect(calculatePoints(2, 0, null, 1, 0, null, 'QF')).toBe(3)
  })
  it('wrong direction returns 0', () => {
    expect(calculatePoints(0, 1, null, 1, 0, null, 'SF')).toBe(0)
  })
  it('exact score + correct qualifier = 5', () => {
    const qualId = 'team-a-uuid'
    expect(calculatePoints(1, 0, qualId, 1, 0, qualId, 'R16')).toBe(5)
  })
  it('correct direction + correct qualifier = 4', () => {
    const qualId = 'team-a-uuid'
    expect(calculatePoints(2, 0, qualId, 1, 0, qualId, 'QF')).toBe(4)
  })
  it('exact score + wrong qualifier = 4', () => {
    expect(calculatePoints(1, 0, 'team-a', 1, 0, 'team-b', 'R16')).toBe(4)
  })
  it('wrong direction + correct qualifier = 1', () => {
    const qualId = 'team-b-uuid'
    expect(calculatePoints(0, 1, qualId, 1, 0, qualId, 'SF')).toBe(1)
  })
})

describe('calculatePoints — FINAL', () => {
  it('exact score returns 5', () => {
    expect(calculatePoints(2, 1, null, 2, 1, null, 'FINAL')).toBe(5)
  })
  it('correct direction returns 4', () => {
    expect(calculatePoints(1, 0, null, 3, 1, null, 'FINAL')).toBe(4)
  })
  it('wrong direction returns 0', () => {
    expect(calculatePoints(0, 1, null, 1, 0, null, 'FINAL')).toBe(0)
  })
  it('exact score + correct winner = 6', () => {
    const wid = 'winner-uuid'
    expect(calculatePoints(2, 1, wid, 2, 1, wid, 'FINAL')).toBe(6)
  })
  it('correct direction + correct winner = 5', () => {
    const wid = 'winner-uuid'
    expect(calculatePoints(1, 0, wid, 3, 0, wid, 'FINAL')).toBe(5)
  })
  it('wrong direction + correct winner = 1', () => {
    const wid = 'winner-uuid'
    expect(calculatePoints(0, 1, wid, 1, 0, wid, 'FINAL')).toBe(1)
  })
})
