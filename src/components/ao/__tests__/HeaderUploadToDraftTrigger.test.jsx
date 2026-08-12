import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HeaderUploadToDraftTrigger, {
  HEADER_UPLOAD_TO_DRAFT_LABEL,
} from '../HeaderUploadToDraftTrigger';

/**
 * Regression: empty conversation state (no artifact panel content) must still
 * expose a clickable header-upload-to-draft trigger. The control was previously
 * sealed inside ArtifactPanel, which only mounts when content already exists.
 */
describe('HeaderUploadToDraftTrigger (empty conversation)', () => {
  it('is present and clickable with no artifact / generated images', () => {
    const onPickFile = jest.fn();
    const onChange = jest.fn();
    const inputRef = { current: null };

    // Simulate AutoV2Panel empty state: no artifactOpen content required.
    render(
      <HeaderUploadToDraftTrigger
        inputRef={inputRef}
        onPickFile={onPickFile}
        onChange={onChange}
        disabled={false}
        uploading={false}
      />
    );

    const trigger = screen.getByRole('button', { name: HEADER_UPLOAD_TO_DRAFT_LABEL });
    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toBeDisabled();

    fireEvent.click(trigger);
    expect(onPickFile).toHaveBeenCalledTimes(1);

    const fileInput = screen.getByTestId('header-upload-to-draft-input');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('disables while uploading', () => {
    render(
      <HeaderUploadToDraftTrigger
        inputRef={{ current: null }}
        onPickFile={jest.fn()}
        onChange={jest.fn()}
        uploading
      />
    );
    expect(screen.getByRole('button', { name: HEADER_UPLOAD_TO_DRAFT_LABEL })).toBeDisabled();
  });
});
