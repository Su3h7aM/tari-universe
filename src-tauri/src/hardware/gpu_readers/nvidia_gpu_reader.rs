// Copyright 2024. The Tari Project
//
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
// following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
// disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
// following disclaimer in the documentation and/or other materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote
// products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
// INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
// USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

use anyhow::{anyhow, Error};
use async_trait::async_trait;
use log::{debug, error};
use nvml_wrapper::{enum_wrappers::device::TemperatureSensor, Nvml};

use crate::{
    hardware::hardware_status_monitor::DeviceParameters,
    utils::platform_utils::{CurrentOperatingSystem, PlatformUtils},
};

use super::GpuParametersReader;

#[derive(Clone)]
pub struct NvidiaGpuReader {}
impl NvidiaGpuReader {
    pub fn new() -> Self {
        Self {}
    }

    pub fn init_nvml(&self) -> Option<Nvml> {
        match Nvml::init() {
            Ok(nvml) => {
                debug!("Nvidia GPU reader initialized");
                Some(nvml)
            }
            Err(e) => {
                error!("Failed to initialize Nvidia GPU reader: {e}");
                None
            }
        }
    }
}

#[async_trait]
impl GpuParametersReader for NvidiaGpuReader {
    fn get_is_reader_implemented(&self) -> bool {
        match PlatformUtils::detect_current_os() {
            CurrentOperatingSystem::Windows => self.init_nvml().is_some(),
            CurrentOperatingSystem::Linux => self.init_nvml().is_some(),
            CurrentOperatingSystem::MacOS => false,
        }
    }
    async fn get_device_parameters(
        &self,
        old_device_parameters: Option<DeviceParameters>,
    ) -> Result<DeviceParameters, Error> {
        let nvml = self
            .init_nvml()
            .ok_or(anyhow!("Failed to initialize Nvidia GPU reader"))?;
        // TODO ADD support for multiple GPUs
        let main_device = nvml
            .device_by_index(0)
            .map_err(|e| anyhow!("Failed to get Nvidia GPU device: {}", e))?;
        let usage_percentage = main_device
            .utilization_rates()
            .map_err(|e| anyhow!("Failed to get Nvidia GPU utilization rates: {}", e))?
            .gpu as f32;
        let current_temperature = main_device
            .temperature(TemperatureSensor::Gpu)
            .map_err(|e| anyhow!("Failed to get Nvidia GPU temperature: {}", e))?
            as f32;

        let device_parameters = DeviceParameters {
            usage_percentage,
            current_temperature,
            max_temperature: old_device_parameters.map_or(current_temperature, |old| {
                old.max_temperature.max(current_temperature)
            }),
        };
        Ok(device_parameters)
    }
}
