export const DISCORD_NOTIFICATION_TIME_ZONE = 'Asia/Tokyo'
export const DISCORD_QUIET_HOURS_START = 23
export const DISCORD_QUIET_HOURS_END = 8

/**
 * Discord通知を送らない時間帯かを、日本時間で判定する。
 *
 * 23:00は抑止対象、08:00は送信可能とする。
 */
export function isDiscordQuietHours(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('有効なDateを指定してください。')
  }

  const hourPart = new Intl.DateTimeFormat('en-US', {
    timeZone: DISCORD_NOTIFICATION_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23'
  })
    .formatToParts(date)
    .find((part) => part.type === 'hour')

  const hour = Number(hourPart?.value)

  if (!Number.isInteger(hour)) {
    throw new Error('Discord通知時刻の判定に失敗しました。')
  }

  return hour >= DISCORD_QUIET_HOURS_START || hour < DISCORD_QUIET_HOURS_END
}

export function discordQuietHoursLabel() {
  return `日本時間${twoDigits(DISCORD_QUIET_HOURS_START)}:00〜${twoDigits(DISCORD_QUIET_HOURS_END)}:00`
}

function twoDigits(value) {
  return String(value).padStart(2, '0')
}
