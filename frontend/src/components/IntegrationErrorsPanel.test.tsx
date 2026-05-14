import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IntegrationErrorsPanel } from './IntegrationErrorsPanel';
import type { IntegrationError } from '../types';

const errorRows: IntegrationError[] = Array.from({ length: 8 }, (_, index) => ({
  id: `err-${index + 1}`,
  projectName: 'North Tower Hospital Expansion',
  sourceSystem: 'ManualImport',
  eventType: 'TimeEntryImport',
  status: 'Failed',
  message: `Rejected sample row ${index + 1}.`,
  externalReference: `sample-invalid-${index + 1}`,
  occurredAtUtc: '2026-05-13T02:22:00Z',
  durationMs: 0
}));

describe('IntegrationErrorsPanel', () => {
  it('bounds the rendered error list so oversized recent results stay readable', () => {
    render(<IntegrationErrorsPanel errors={errorRows} />);

    expect(screen.getByRole('list')).toHaveClass('event-list--bounded');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });
});
