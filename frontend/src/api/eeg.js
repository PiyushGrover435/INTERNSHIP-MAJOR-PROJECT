import axios from 'axios';

const FLASK_BASE = '';

/**
 * Send one row of EEG data to Flask for cognitive load classification.
 * @param {Object} rowData - EEG band power values from one CSV row
 * @param {number} rowIndex - Current row index (for display)
 * @param {string} subjectId - Subject identifier
 * @returns {{ risk, confidence, message, recommendations, band_powers }}
 */
export const simulateEEG = async (rowData, rowIndex = 0, subjectId = 'Demo') => {
  const response = await axios.post(
    `${FLASK_BASE}/api/simulate/eeg`,
    { ...rowData, row_index: rowIndex, subject_id: subjectId },
    { timeout: 5000 }
  );
  return response.data;
};

/**
 * Health check for the EEG simulator route.
 */
export const checkEEGHealth = async () => {
  try {
    const response = await axios.get(`${FLASK_BASE}/api/simulate/eeg/health`, { timeout: 3000 });
    return response.data.status === 'ok';
  } catch {
    return false;
  }
};
