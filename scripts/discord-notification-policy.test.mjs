import assert from 'node:assert/strict'
import test from 'node:test'
import {
  discordQuietHoursLabel,
  isDiscordQuietHours
} from './discord-notification-policy.mjs'

test('日本時間23時から翌8時までをDiscord通知の抑止時間にする', () => {
  assert.equal(
    isDiscordQuietHours(new Date('2026-09-11T13:59:59Z')),
    false,
    '日本時間22:59:59は送信できる'
  )
  assert.equal(
    isDiscordQuietHours(new Date('2026-09-11T14:00:00Z')),
    true,
    '日本時間23:00は抑止する'
  )
  assert.equal(
    isDiscordQuietHours(new Date('2026-09-11T22:59:59Z')),
    true,
    '日本時間07:59:59は抑止する'
  )
  assert.equal(
    isDiscordQuietHours(new Date('2026-09-11T23:00:00Z')),
    false,
    '日本時間08:00は送信できる'
  )
})

test('通知抑止時間を利用者向けに表示できる', () => {
  assert.equal(discordQuietHoursLabel(), '日本時間23:00〜08:00')
})

test('無効な日時は通知可能として扱わずエラーにする', () => {
  assert.throws(
    () => isDiscordQuietHours(new Date('invalid')),
    /有効なDate/
  )
})
