import { mountSuspended } from '@nuxt/test-utils/runtime'
import { expect, test } from 'vitest'

import AppHeader from '../../app/components/AppHeader.vue'

test('test_AppHeader_when_logout_is_enabled_then_emits_logout', async () => {
  // Arrange
  const wrapper = await mountSuspended(AppHeader, {
    props: { showLogout: true },
  })

  // Act
  await wrapper.get('button[aria-label="登出"]').trigger('click')

  // Assert
  expect(wrapper.emitted('logout')).toHaveLength(1)
})

test('test_AppHeader_when_logout_is_disabled_then_hides_logout_button', async () => {
  // Arrange
  const wrapper = await mountSuspended(AppHeader)

  // Assert
  expect(wrapper.find('button[aria-label="登出"]').exists()).toBe(false)
  expect(wrapper.get('a[aria-label="冰記首頁"]').text()).toContain('冰記')
})
