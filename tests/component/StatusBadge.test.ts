import { mountSuspended } from '@nuxt/test-utils/runtime'
import { expect, test } from 'vitest'

import StatusBadge from '../../app/components/StatusBadge.vue'
import { REGISTRATION_STATUS, type RegistrationStatus } from '../../shared/types/domain'

test.each([
  [REGISTRATION_STATUS.REGISTERED, '已報名', 'status-badge--info'],
  [REGISTRATION_STATUS.ATTENDED, '已到課', 'status-badge--success'],
  [REGISTRATION_STATUS.ABSENT, '未到課', 'status-badge--warning'],
  [REGISTRATION_STATUS.CANCELLED, '已取消', 'status-badge--muted'],
] as Array<[RegistrationStatus, string, string]>)('test_StatusBadge_when_status_is_%s_then_renders_expected_presentation',
  async (status, expectedLabel, expectedClass) => {
    // Arrange
    const wrapper = await mountSuspended(StatusBadge, {
      props: { status },
    })

    // Act
    const badge = wrapper.get('.status-badge')

    // Assert
    expect(badge.text()).toBe(expectedLabel)
    expect(badge.classes()).toContain(expectedClass)
  },
)
