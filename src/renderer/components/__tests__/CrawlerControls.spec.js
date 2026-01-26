import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CrawlerControls from '../CrawlerControls.vue'

describe('CrawlerControls Component', () => {
  describe('Initial State (Idle)', () => {
    it('renders reset button in idle state', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Reset')
    })

    it('renders export button in idle state', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Export')
    })

    it('does not render pause/resume when idle', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).not.toContain('Pause')
      expect(wrapper.text()).not.toContain('Resume')
    })

    it('does not render stop when idle', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).not.toContain('Stop')
    })

    it('does not render save when idle', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).not.toContain('Save')
    })
  })

  describe('Active State (Crawling)', () => {
    it('renders pause button when crawling', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Pause')
    })

    it('does not render resume button when crawling', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).not.toContain('Resume')
    })

    it('renders stop button when crawling', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Stop')
    })

    it('renders save button when crawling', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Save')
    })

    it('renders reset and export buttons when crawling', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Reset')
      expect(wrapper.text()).toContain('Export')
    })
  })

  describe('Paused State', () => {
    it('renders resume button when paused', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: true,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Resume')
    })

    it('does not render pause button when paused', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: true,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).not.toContain('Pause')
    })

    it('renders stop button when paused', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: true,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Stop')
    })

    it('renders save button when paused', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: true,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Save')
    })
  })

  describe('Backoff State', () => {
    it('renders continue anyway button when backoff max reached', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: true
        }
      })

      expect(wrapper.text()).toContain('Continue Anyway')
    })

    it('does not render continue anyway button when backoff not reached', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).not.toContain('Continue Anyway')
    })

    it('still shows other controls when backoff reached', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: true
        }
      })

      expect(wrapper.text()).toContain('Reset')
      expect(wrapper.text()).toContain('Export')
      expect(wrapper.text()).toContain('Continue Anyway')
    })
  })

  describe('Event Emissions', () => {
    it('emits pause event on pause button click', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      const pauseButton = wrapper.findAll('button').find(b => b.text().includes('Pause'))
      await pauseButton.trigger('click')

      expect(wrapper.emitted('pause')).toBeTruthy()
    })

    it('emits resume event on resume button click', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: true,
          isBackoffMaxReached: false
        }
      })

      const resumeButton = wrapper.findAll('button').find(b => b.text().includes('Resume'))
      await resumeButton.trigger('click')

      expect(wrapper.emitted('resume')).toBeTruthy()
    })

    it('emits stop event on stop button click', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      const stopButton = wrapper.findAll('button').find(b => b.text().includes('Stop'))
      await stopButton.trigger('click')

      expect(wrapper.emitted('stop')).toBeTruthy()
    })

    it('emits reset event on reset button click', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      const resetButton = wrapper.findAll('button').find(b => b.text().includes('Reset'))
      await resetButton.trigger('click')

      expect(wrapper.emitted('reset')).toBeTruthy()
    })

    it('emits save event on save button click', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      const saveButton = wrapper.findAll('button').find(b => b.text().includes('Save'))
      await saveButton.trigger('click')

      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('emits export event on export button click', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      const exportButton = wrapper.findAll('button').find(b => b.text().includes('Export'))
      await exportButton.trigger('click')

      expect(wrapper.emitted('export')).toBeTruthy()
    })

    it('emits continue-anyway event on continue anyway button click', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: false,
          isPaused: false,
          isBackoffMaxReached: true
        }
      })

      const continueButton = wrapper.findAll('button').find(b => b.text().includes('Continue Anyway'))
      await continueButton.trigger('click')

      expect(wrapper.emitted('continue-anyway')).toBeTruthy()
    })
  })

  describe('Complex Scenarios', () => {
    it('handles transition from active to paused', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Pause')

      await wrapper.setProps({ isPaused: true })

      expect(wrapper.text()).not.toContain('Pause')
      expect(wrapper.text()).toContain('Resume')
    })

    it('handles transition from paused to active', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: true,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Resume')

      await wrapper.setProps({ isPaused: false })

      expect(wrapper.text()).not.toContain('Resume')
      expect(wrapper.text()).toContain('Pause')
    })

    it('handles transition from active to idle', async () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      expect(wrapper.text()).toContain('Stop')

      await wrapper.setProps({ isActive: false })

      expect(wrapper.text()).not.toContain('Stop')
      expect(wrapper.text()).not.toContain('Pause')
    })
  })

  describe('Accessibility', () => {
    it('renders all buttons properly', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: true
        }
      })

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
      buttons.forEach(button => {
        expect(button.element.tagName).toBe('BUTTON')
      })
    })

    it('buttons have readable text labels', () => {
      const wrapper = mount(CrawlerControls, {
        props: {
          isActive: true,
          isPaused: false,
          isBackoffMaxReached: false
        }
      })

      const buttons = wrapper.findAll('button')
      buttons.forEach(button => {
        expect(button.text()).toBeTruthy()
      })
    })
  })
})
