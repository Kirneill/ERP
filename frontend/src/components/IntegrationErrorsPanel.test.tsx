import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

    expect(screen.getByRole('button', { name: /download exception report/i })).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveClass('event-list--bounded');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('downloads the visible integration errors as a CSV exception report', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((_object: Blob | MediaSource) => 'blob:exception-report');
    const revokeObjectURL = vi.fn((_url: string) => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    render(<IntegrationErrorsPanel errors={[errorRows[0]]} />);
    await user.click(screen.getByRole('button', { name: /download exception report/i }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:exception-report');
    const blob = createObjectURL.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) {
      throw new Error('Expected CSV download to create a Blob.');
    }
    await expect(blob.text()).resolves.toContain('"sourceSystem","eventType","status","project","externalReference","message","occurredAtUtc"');
    await expect(blob.text()).resolves.toContain('"ManualImport","TimeEntryImport","Failed","North Tower Hospital Expansion"');
    click.mockRestore();
  });

  it('hides the CSV download action when there are no recent errors', () => {
    render(<IntegrationErrorsPanel errors={[]} />);

    expect(screen.queryByRole('button', { name: /download exception report/i })).not.toBeInTheDocument();
  });
});
