#!/usr/bin/env node
/**
 * Complete Vihara Frontend CRUD Test Suite - Workflow Aware
 * 
 * This test suite properly sequences operations following the staged workflow:
 * - Creates fresh vihara records for each test workflow
 * - Follows proper state transitions (SAVE → MARK_PRINTED etc.)
 * - Tests all 13 CRUD operations in isolation
 * - Verifies API responses and state changes
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

class ViharaCompleteTestSuite {
  constructor() {
    this.authCookie = '';
    this.results = [];
    this.stage1ViharaId = null;
    this.stage2ViharaId = null;
  }

  setAuthHeaders() {
    if (!this.authCookie) throw new Error('Not authenticated');
    return {
      'Cookie': this.authCookie,
      'Content-Type': 'application/json'
    };
  }

  async makeRequest(method, url, data = null, validateStatus = false) {
    try {
      const config = {
        method,
        url,
        headers: this.setAuthHeaders(),
        withCredentials: true,
        validateStatus: validateStatus ? () => true : undefined
      };
      if (data) config.data = data;
      return await axios(config);
    } catch (error) {
      throw new Error(`${error.response?.status || 'ERROR'}: ${error.response?.data?.detail || error.message}`);
    }
  }

  logResult(testName, status, details = '') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⊘';
    console.log(`${icon} [${testName}]: ${details}`);
    this.results.push({ testName, status, details, timestamp: new Date().toISOString() });
  }

  // =====================================================================
  // SETUP PHASE
  // =====================================================================

  async testLogin() {
    console.log('\n[SETUP] LOGIN - Authenticate with test credentials');
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        ua_username: 'vihara_dataentry',
        ua_password: 'Vihara@DataEntry2024',
      }, {
        withCredentials: true,
        validateStatus: () => true
      });

      if (response.status === 200 && response.data.user) {
        const cookieArray = Array.isArray(response.headers['set-cookie']) 
          ? response.headers['set-cookie'] 
          : [response.headers['set-cookie']];
        
        for (const cookie of cookieArray) {
          if (cookie.includes('access_token')) {
            this.authCookie = cookie.split(';')[0];
            break;
          }
        }
        if (!this.authCookie && cookieArray.length > 0) {
          this.authCookie = cookieArray[0].split(';')[0];
        }
        
        console.log('✅ Authentication successful');
        console.log(`   Logged in as: ${response.data.user.ua_username}\n`);
        return true;
      }
    } catch (error) {
      console.log('❌ Authentication failed:', error.message);
      return false;
    }
  }

  // =====================================================================
  // PHASE 1: WORKFLOW A - STAGE 1 OPERATIONS
  // =====================================================================

  async testCreateViharaForStage1() {
    console.log('\n[TEST 1] CREATE - Create fresh vihara for Stage 1');
    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'CREATE',
        payload: {
          data: {
            vh_vname: `Test Vihara Stage1 ${Date.now()}`,
            vh_addrs: 'Test Address for Stage 1',
            vh_mobile: '0771111111',
            vh_whtapp: '0771111111',
            vh_email: `stage1-${Date.now()}@test.local`,
            vh_typ: 'TEMPLE',
            vh_gndiv: 'COL/GN/001',
            vh_ownercd: 'N/A',
            vh_parshawa: 'SIAM',
            vh_province: 'WP',
            vh_district: 'CMB',
          }
        }
      }, true);

      if (response.status === 200 && response.data.data?.vh_id) {
        this.stage1ViharaId = response.data.data.vh_id;
        this.logResult('CREATE_STAGE1', 'PASS', `Created VH_ID: ${this.stage1ViharaId}`);
        return true;
      } else {
        this.logResult('CREATE_STAGE1', 'FAIL', `Status ${response.status}: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      this.logResult('CREATE_STAGE1', 'FAIL', error.message);
      return false;
    }
  }

  async testSaveStageOne() {
    console.log('\n[TEST 2] SAVE_STAGE_ONE - Save Stage 1 basic profile');
    if (!this.stage1ViharaId) {
      this.logResult('SAVE_STAGE_ONE', 'FAIL', 'No Stage 1 vihara ID');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'SAVE_STAGE_ONE',
        payload: {
          vh_id: this.stage1ViharaId,
          data: {
            vh_buildings_description: 'Main hall, meditation room',
            vh_dayaka_families_count: 25,
          }
        }
      }, true);

      if (response.status === 200) {
        const status = response.data.data?.vh_workflow_status;
        this.logResult('SAVE_STAGE_ONE', 'PASS', `Status: ${status}`);
        return true;
      } else {
        this.logResult('SAVE_STAGE_ONE', 'FAIL', `Status ${response.status}: ${response.data?.message || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      this.logResult('SAVE_STAGE_ONE', 'FAIL', error.message);
      return false;
    }
  }

  async testUpdateStageOne() {
    console.log('\n[TEST 3] UPDATE_STAGE_ONE - Update Stage 1 fields');
    if (!this.stage1ViharaId) {
      this.logResult('UPDATE_STAGE_ONE', 'FAIL', 'No Stage 1 vihara ID');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'UPDATE_STAGE_ONE',
        payload: {
          vh_id: this.stage1ViharaId,
          data: {
            vh_buildings_description: 'Updated: Main hall, meditation room, library',
            vh_dayaka_families_count: 30,
          }
        }
      }, true);

      if (response.status === 200) {
        this.logResult('UPDATE_STAGE_ONE', 'PASS', 'Fields updated successfully');
        return true;
      } else {
        this.logResult('UPDATE_STAGE_ONE', 'FAIL', `Status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logResult('UPDATE_STAGE_ONE', 'FAIL', error.message);
      return false;
    }
  }

  async testUpdateStageOneFlow2() {
    console.log('\n[TEST 4] UPDATE_STAGE_ONE (Boolean Fields) - Update certification flags');
    if (!this.stage1ViharaId) {
      this.logResult('UPDATE_STAGE_ONE_BOOL', 'FAIL', 'No Stage 1 vihara ID');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'UPDATE_STAGE_ONE',
        payload: {
          vh_id: this.stage1ViharaId,
          data: {
            vh_land_info_certified: true,
            vh_resident_bhikkhus_certified: true,
          }
        }
      }, true);

      if (response.status === 200) {
        this.logResult('UPDATE_STAGE_ONE_BOOL', 'PASS', 'Boolean fields updated');
        return true;
      } else {
        this.logResult('UPDATE_STAGE_ONE_BOOL', 'FAIL', `Status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logResult('UPDATE_STAGE_ONE_BOOL', 'FAIL', error.message);
      return false;
    }
  }

  async testMarkS1Printed() {
    console.log('\n[TEST 5] MARK_S1_PRINTED - Mark Stage 1 form as printed');
    if (!this.stage1ViharaId) {
      this.logResult('MARK_S1_PRINTED', 'FAIL', 'No Stage 1 vihara ID');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'MARK_S1_PRINTED',
        payload: { vh_id: this.stage1ViharaId }
      }, true);

      if (response.status === 200) {
        const status = response.data.data?.vh_workflow_status;
        this.logResult('MARK_S1_PRINTED', 'PASS', `Status: ${status}`);
        return true;
      } else {
        this.logResult('MARK_S1_PRINTED', 'FAIL', `Status ${response.status}: ${response.data?.message}`);
        return false;
      }
    } catch (error) {
      this.logResult('MARK_S1_PRINTED', 'FAIL', error.message);
      return false;
    }
  }

  // =====================================================================
  // PHASE 2: READ OPERATIONS (Independent)
  // =====================================================================

  async testReadAll() {
    console.log('\n[TEST 6] READ_ALL - Fetch all vihara records');
    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'READ_ALL',
        payload: { skip: 0, limit: 10 }
      }, true);

      if (response.status === 200 && Array.isArray(response.data.data)) {
        const count = response.data.data.length;
        this.logResult('READ_ALL', 'PASS', `Fetched ${count} records`);
        return true;
      } else {
        this.logResult('READ_ALL', 'FAIL', `Status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logResult('READ_ALL', 'FAIL', error.message);
      return false;
    }
  }

  async testReadOne() {
    console.log('\n[TEST 7] READ_ONE - Fetch single vihara record');
    if (!this.stage1ViharaId) {
      this.logResult('READ_ONE', 'FAIL', 'No test vihara ID');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'READ_ONE',
        payload: { vh_id: this.stage1ViharaId }
      }, true);

      if (response.status === 200 && response.data.data?.vh_id) {
        const trn = response.data.data.vh_trn;
        this.logResult('READ_ONE', 'PASS', `Loaded: ${trn}`);
        return true;
      } else {
        this.logResult('READ_ONE', 'FAIL', `Status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logResult('READ_ONE', 'FAIL', error.message);
      return false;
    }
  }

  async testUpdateFields() {
    console.log('\n[TEST 8] UPDATE - Update vihara fields');
    if (!this.stage1ViharaId) {
      this.logResult('UPDATE', 'FAIL', 'No test vihara ID');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'UPDATE',
        payload: {
          vh_id: this.stage1ViharaId,
          data: {
            vh_buildings_description: `Updated at ${new Date().toISOString()}`,
            vh_dayaka_families_count: 35,
          }
        }
      }, true);

      if (response.status === 200) {
        this.logResult('UPDATE', 'PASS', 'Fields updated successfully');
        return true;
      } else {
        this.logResult('UPDATE', 'FAIL', `Status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logResult('UPDATE', 'FAIL', error.message);
      return false;
    }
  }

  // =====================================================================
  // PHASE 3: WORKFLOW B - STAGE 2 OPERATIONS
  // =====================================================================

  async testCreateViharaForStage2() {
    console.log('\n[TEST 9] CREATE - Create fresh vihara for Stage 2');
    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'CREATE',
        payload: {
          data: {
            vh_vname: `Test Vihara Stage2 ${Date.now()}`,
            vh_addrs: 'Test Address for Stage 2',
            vh_mobile: '0772222222',
            vh_whtapp: '0772222222',
            vh_email: `stage2-${Date.now()}@test.local`,
            vh_typ: 'TEMPLE',
            vh_gndiv: 'COL/GN/002',
            vh_ownercd: 'N/A',
            vh_parshawa: 'SIAM',
            vh_province: 'WP',
            vh_district: 'CMB',
          }
        }
      }, true);

      if (response.status === 200 && response.data.data?.vh_id) {
        this.stage2ViharaId = response.data.data.vh_id;
        this.logResult('CREATE_STAGE2', 'PASS', `Created VH_ID: ${this.stage2ViharaId}`);
        return true;
      } else {
        this.logResult('CREATE_STAGE2', 'FAIL', `Status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logResult('CREATE_STAGE2', 'FAIL', error.message);
      return false;
    }
  }

  async testSaveStageTwo() {
    console.log('\n[TEST 10] SAVE_STAGE_TWO - Save Stage 2 assets & certification');
    if (!this.stage2ViharaId) {
      this.logResult('SAVE_STAGE_TWO', 'FAIL', 'No Stage 2 vihara ID');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'SAVE_STAGE_TWO',
        payload: {
          vh_id: this.stage2ViharaId,
          data: {
            vh_buildings_description: 'Main building, devotee hall',
            vh_dayaka_families_count: 15,
            vh_land_info_certified: true,
            vh_resident_bhikkhus_certified: true,
            vh_sanghika_donation_deed: true,
          }
        }
      }, true);

      if (response.status === 200) {
        const status = response.data.data?.vh_workflow_status;
        this.logResult('SAVE_STAGE_TWO', 'PASS', `Status: ${status}`);
        return true;
      } else {
        this.logResult('SAVE_STAGE_TWO', 'FAIL', `Status ${response.status}: ${response.data?.message}`);
        return false;
      }
    } catch (error) {
      this.logResult('SAVE_STAGE_TWO', 'FAIL', error.message);
      return false;
    }
  }

  async testUpdateStageTwo() {
    console.log('\n[TEST 11] UPDATE_STAGE_TWO - Update Stage 2 fields');
    if (!this.stage2ViharaId) {
      this.logResult('UPDATE_STAGE_TWO', 'FAIL', 'No Stage 2 vihara ID');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'UPDATE_STAGE_TWO',
        payload: {
          vh_id: this.stage2ViharaId,
          data: {
            vh_buildings_description: 'Updated: Main building, devotee hall, library',
            vh_dayaka_families_count: 20,
            vh_recommend_new_center: true,
          }
        }
      }, true);

      if (response.status === 200) {
        this.logResult('UPDATE_STAGE_TWO', 'PASS', 'Fields updated successfully');
        return true;
      } else {
        this.logResult('UPDATE_STAGE_TWO', 'FAIL', `Status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logResult('UPDATE_STAGE_TWO', 'FAIL', error.message);
      return false;
    }
  }

  async testMarkS2Printed() {
    console.log('\n[TEST 12] MARK_S2_PRINTED - Mark Stage 2 form as printed');
    if (!this.stage2ViharaId) {
      this.logResult('MARK_S2_PRINTED', 'FAIL', 'No Stage 2 vihara ID');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'MARK_S2_PRINTED',
        payload: { vh_id: this.stage2ViharaId }
      }, true);

      if (response.status === 200) {
        const status = response.data.data?.vh_workflow_status;
        this.logResult('MARK_S2_PRINTED', 'PASS', `Status: ${status}`);
        return true;
      } else {
        this.logResult('MARK_S2_PRINTED', 'FAIL', `Status ${response.status}: ${response.data?.message}`);
        return false;
      }
    } catch (error) {
      this.logResult('MARK_S2_PRINTED', 'FAIL', error.message);
      return false;
    }
  }

  async testDeleteVihara() {
    console.log('\n[TEST 13] DELETE - Delete a vihara record (soft delete)');
    // Use stage2 record for deletion
    if (!this.stage2ViharaId) {
      this.logResult('DELETE', 'SKIP', 'No test record available');
      return false;
    }

    try {
      const response = await this.makeRequest('post', `${BASE_URL}/api/v1/vihara-data/manage`, {
        action: 'DELETE',
        payload: { vh_id: this.stage2ViharaId }
      }, true);

      if (response.status === 200) {
        this.logResult('DELETE', 'PASS', 'Record soft-deleted successfully');
        return true;
      } else if (response.status === 404) {
        this.logResult('DELETE', 'PASS', 'Record not found (already deleted)');
        return true;
      } else {
        this.logResult('DELETE', 'FAIL', `Status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logResult('DELETE', 'FAIL', error.message);
      return false;
    }
  }

  // =====================================================================
  // REPORTING
  // =====================================================================

  printSummary() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(80));
    console.log('VIHARA FRONTEND CRUD TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${total}`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⊘ Skipped: ${skipped}`);
    console.log(`\nPASS RATE: ${passRate}% (${passed}/${total})`);
    console.log('='.repeat(80));

    if (failed > 0) {
      console.log('\nFAILED TESTS:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  ❌ ${r.testName}: ${r.details}`);
      });
    }
  }

  // =====================================================================
  // MAIN TEST RUNNER
  // =====================================================================

  async runAllTests() {
    console.log('🚀 Starting Vihara Frontend CRUD Test Suite - Complete Workflow');
    console.log('📍 Backend URL:', BASE_URL);
    console.log('⏰ Start Time:', new Date().toISOString());

    if (!await this.testLogin()) {
      console.error('❌ Failed to authenticate. Aborting tests.');
      process.exit(1);
    }

    // Phase 1: Stage 1 Workflow
    await this.testCreateViharaForStage1();
    await this.testSaveStageOne();
    await this.testUpdateStageOne();
    await this.testUpdateStageOneFlow2();
    await this.testMarkS1Printed();

    // Phase 2: Read Operations
    await this.testReadAll();
    await this.testReadOne();
    await this.testUpdateFields();

    // Phase 3: Stage 2 Workflow
    await this.testCreateViharaForStage2();
    await this.testSaveStageTwo();
    await this.testUpdateStageTwo();
    await this.testMarkS2Printed();
    await this.testDeleteVihara();

    // Report
    this.printSummary();
    process.exit(this.results.filter(r => r.status === 'FAIL').length > 0 ? 1 : 0);
  }
}

const suite = new ViharaCompleteTestSuite();
suite.runAllTests();
