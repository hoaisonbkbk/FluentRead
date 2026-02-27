<template>
  <!-- BậtTắt -->
  <el-row class="margin-bottom margin-left-2em">
    <el-col :span="20" class="lightblue rounded-corner">
      <span class="popup-text popup-vertical-left">Trạng thái tiện ích</span>
    </el-col>

    <el-col :span="4" class="flex-end">
      <el-switch v-model="config.on" inline-prompt active-text="Bật" inactive-text="Tắt" @change="handlePluginStateChange" />
    </el-col>
  </el-row>

  <!-- phần giữ chỗ -->
  <div v-if="!config.on">
    <el-empty description="Tiện ích đang bị tắt" />
  </div>

  <div v-show="config.on">
    <!--    Chế độ dịch-->
    <el-row class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <span class="popup-text popup-vertical-left">Chế độ dịch</span>
      </el-col>
      <el-col :span="12">
        <el-select v-model="config.display" placeholder="Chọn chế độ dịch">
          <el-option class="select-left" v-for="item in options.display" :key="item.value" :label="item.label"
            :value="item.value" />
        </el-select>
      </el-col>
    </el-row>

    <!--    Kiểu hiển thị bộ chọn dịch-->
    <el-row v-show="config.display === 1" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Chọn kiểu hiển thị bản dịch trong chế độ song ngữ với nhiều hiệu ứng đẹp mắt" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">Kiểu hiển thị bản dịch<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-select v-model="config.style" placeholder="Chọn kiểu hiển thị bản dịch">
          <el-option-group v-for="group in styleGroups" :key="group.value" :label="group.label">
            <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item.value"
              :class="item.class" />
          </el-option-group>
        </el-select>
      </el-col>
    </el-row>

    <!-- Dịch vụ dịch -->
    <el-row class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Dịch máy: nhanh và ổn định, phù hợp hằng ngày; Dịch AI: tự nhiên hơn, cần cấu hình token" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">Dịch vụ dịch<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <b>
          <el-select v-model="config.service" placeholder="Chọn dịch vụ dịch">
            <el-option class="select-left" v-for="item in compute.filteredServices" :key="item.value"
              :label="item.label" :value="item.value" :disabled="item.disabled"
              :class="{ 'select-divider': item.disabled }" />
          </el-select>
        </b>
      </el-col>
    </el-row>

    <!-- Ngôn ngữ đích -->
    <el-row class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <span class="popup-text popup-vertical-left">Ngôn ngữ đích</span>
      </el-col>
      <el-col :span="12">
        <el-select v-model="config.to" placeholder="Chọn ngôn ngữ đích">
          <el-option class="select-left" v-for="item in options.to" :key="item.value" :label="item.label"
            :value="item.value" />
        </el-select>
      </el-col>
    </el-row>



    <!-- Phím tắt rê chuột -->
    <el-row class="margin-bottom margin-left-2em" :class="{ 'custom-hotkey-row': config.hotkey === 'custom' }">
      <el-col :span="14" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Giữ phím tắt đã chọn và rê chuột lên văn bản để dịch" placement="top-start" :show-after="500">
        <span class="popup-text popup-vertical-left">
          Phím tắt rê chuột
          <el-icon class="icon-margin">
            <ChatDotRound />
          </el-icon>
        </span>
        </el-tooltip>
      </el-col>
      <el-col :span="10" class="flex-end">
        <div class="hotkey-config">
          <el-select 
            v-model="config.hotkey" 
            placeholder="Chọn phím tắt" 
            size="small" 
            style="width: 100%"
            @change="handleMouseHotkeyChange"
          >
            <el-option v-for="item in options.keys" :key="item.value" :label="item.label" :value="item.value" :disabled="item.disabled" :class="{ 'select-divider': item.disabled }" />
          </el-select>
          
          <!-- Phím tắt hiển thị tùy chỉnh (luôn hiển thị khi tùy chỉnh được chọn) -->
          <div v-if="config.hotkey === 'custom'" class="custom-hotkey-display">
            <span class="hotkey-text" v-if="config.customHotkey">
              {{ getCustomMouseHotkeyDisplayName() }}
            </span>
            <span class="hotkey-text placeholder-text" v-else>
              Nhấn để đặt phím tắt tùy chỉnh
            </span>
            <el-button size="small" type="text" @click="openCustomMouseHotkeyDialog" class="edit-button">
              <el-icon><Edit /></el-icon>
            </el-button>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- Phím tắt toàn bộ lựa chọn dịch vụ -->
    <el-row v-if="config.on" class="margin-bottom margin-left-2em margin-top-1em" :class="{ 'custom-hotkey-row': config.floatingBallHotkey === 'custom' }">
      <el-col :span="14" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="(Bản thử nghiệm) Cài phím tắt để bật/tắt dịch toàn trang nhanh mà không cần bấm bóng nổi" placement="top-start" :show-after="500">
        <span class="popup-text popup-vertical-left">
          <!-- <span class="new-feature-badge">Mới</span> -->
          Phím tắt dịch toàn trang
          <el-icon class="icon-margin">
            <ChatDotRound />
          </el-icon>
        </span>
        </el-tooltip>
      </el-col>
      <el-col :span="10" class="flex-end">
        <div class="hotkey-config">
          <el-select 
            v-model="config.floatingBallHotkey" 
            placeholder="Chọn phím tắt" 
            size="small" 
            style="width: 100%"
            @change="handleHotkeyChange"
          >
            <el-option v-for="item in options.floatingBallHotkeys" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          
          <!-- Phím tắt hiển thị tùy chỉnh (luôn hiển thị khi tùy chỉnh được chọn) -->
          <div v-if="config.floatingBallHotkey === 'custom'" class="custom-hotkey-display">
            <span class="hotkey-text" v-if="config.customFloatingBallHotkey">
              {{ getCustomHotkeyDisplayName() }}
            </span>
            <span class="hotkey-text placeholder-text" v-else>
              Nhấn để đặt phím tắt tùy chỉnh
            </span>
            <el-button size="small" type="text" @click="openCustomHotkeyDialog" class="edit-button">
              <el-icon><Edit /></el-icon>
            </el-button>
          </div>
        </div>
      </el-col>
    </el-row>


    <!-- Chọn chữ Chế độ dịch -->
    <el-row v-if="config.on" class="margin-bottom margin-left-2em margin-top-1em">
      <el-col :span="14" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Sau khi bôi chọn văn bản sẽ hiện chấm đỏ; rê chuột vào chấm đỏ để xem bản dịch. Có thể tắt, hiển thị song ngữ hoặc chỉ hiển thị bản dịch" placement="top-start" :show-after="500">
      <span class="popup-text popup-vertical-left">
        <!-- <span class="new-feature-badge">Mới</span> -->
        Dịch khi bôi chọn
        <el-icon class="icon-margin">
          <ChatDotRound />
        </el-icon>
      </span>
        </el-tooltip>
      </el-col>
      <el-col :span="10" class="flex-end">
        <el-select v-model="config.selectionTranslatorMode" placeholder="Chọn chế độ" size="small" style="width: 100%">
          <el-option label="Tắt" value="disabled" />
          <el-option label="Hiển thị song ngữ" value="bilingual" />
          <el-option label="Chỉ hiển thị bản dịch" value="translation-only" />
        </el-select>
      </el-col>
    </el-row>

    <!-- token -->
    <el-row v-show="compute.showToken" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark"
          content="Token API chỉ lưu cục bộ để truy cập dịch vụ dịch. Cách lấy token vui lòng xem tài liệu chính thức của từng dịch vụ; khi dùng Ollama, token có thể là bất kỳ giá trị nào" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">Token truy cập<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.token[config.service]" type="password" show-password placeholder="Nhập token API" />
      </el-col>
    </el-row>

    <!-- Cấu hình điểm cuối Azure OpenAI -->
    <el-row v-show="compute.showAzureOpenaiEndpoint" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark"
          content="Địa chỉ endpoint Azure OpenAI phải chứa đầy đủ thông tin triển khai. Định dạng: https://your-resource-name.openai.azure.com/openai/deployments/your-deployment-name/chat/completions?api-version=2024-02-15-preview" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">Endpoint Azure<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input
          v-model="config.azureOpenaiEndpoint"
          placeholder="https://your-resource.openai.azure.com/openai/deployments/your-model/chat/completions?api-version=2024-02-15-preview"
          :class="{ 'input-error': config.azureOpenaiEndpoint && !isValidAzureEndpoint(config.azureOpenaiEndpoint) }"
        />
        <div v-if="config.azureOpenaiEndpoint && !isValidAzureEndpoint(config.azureOpenaiEndpoint)" class="error-text">
          Định dạng endpoint không đúng, cần chứa tên miền openai.azure.com và đường dẫn /chat/completions
        </div>
      </el-col>
    </el-row>

    <!-- Cấu hình URL DeepLX-->
    <el-row v-show="compute.showDeepLX" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark"
          content="Địa chỉ API DeepLX, mặc định là địa chỉ cục bộ. Nếu dùng DeepLX từ xa, hãy đổi sang địa chỉ dịch vụ tương ứng" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">Địa chỉ dịch vụ</span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.deeplx" placeholder="http://localhost:1188/translate" />
      </el-col>
    </el-row>

    <!-- Sử dụng AkSk -->
    <el-row v-show="compute.showAkSk" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Cặp khóa API Baidu ERNIE, dùng để truy cập dịch vụ dịch" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">API Key<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.ak" placeholder="Nhập Access Key" />
      </el-col>
    </el-row>
    <el-row v-show="compute.showAkSk" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Cặp khóa API Baidu ERNIE, dùng để truy cập dịch vụ dịch" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">Secret Key<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.sk" type="password" placeholder="Nhập Secret Key" />
      </el-col>
    </el-row>

    <!-- Cấu hình Youdao Dịch -->
    <el-row v-show="compute.showYoudao" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="App ID API Youdao Zhiyun, dùng để truy cập dịch vụ dịch Youdao. Có thể lấy trong bảng điều khiển Youdao Zhiyun" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">App Key<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.youdaoAppKey" placeholder="Youdao AppKey" />
      </el-col>
    </el-row>
    <el-row v-show="compute.showYoudao" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="App Secret API Youdao Zhiyun, dùng để truy cập dịch vụ dịch Youdao. Có thể lấy trong bảng điều khiển Youdao Zhiyun" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">App Secret<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.youdaoAppSecret" type="password" show-password placeholder="Youdao AppSecret" />
      </el-col>
    </el-row>

    <!-- Cấu hình máy dịch vụ Tencent Cloud -->
    <el-row v-show="compute.showTencent" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Secret ID API Tencent Cloud, dùng cho dịch vụ dịch máy Tencent Cloud. Lấy trong mục Quản lý truy cập của Tencent Cloud" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">Secret ID<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.tencentSecretId" placeholder="Tencent Cloud SecretId" />
      </el-col>
    </el-row>
    <el-row v-show="compute.showTencent" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Secret Key API Tencent Cloud, dùng cho dịch vụ dịch máy Tencent Cloud. Lấy trong mục Quản lý truy cập của Tencent Cloud" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">Secret Key<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.tencentSecretKey" type="password" show-password placeholder="Tencent Cloud SecretKey" />
      </el-col>
    </el-row>

    <!--  Coze cần hiển thị robot_id -->
    <el-row v-show="compute.showRobotId" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="ID bot Coze, xem cách lấy trong tài liệu nhà phát triển Coze" placement="top-start"
          :show-after="500">
          <span class="popup-text popup-vertical-left">ID bot<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.robot_id[config.service]" placeholder="Nhập ID bot Coze" />
      </el-col>
    </el-row>

    <!-- Cấu hình Mô hình lớn cục bộ -->
    <el-row v-show="compute.showCustom" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Hiện chỉ hỗ trợ API theo định dạng OpenAI, ví dụ: http://localhost:3000/v1/chat/completions; trong đó localhost:11434 có thể thay bằng bất kỳ địa chỉ nào.
                     Tham khảo cấu hình Ollama tại: https://fluent.thinkstu.com/guide/faq.html" placement="top-start" :show-after="500">
          <span class="popup-text popup-vertical-left">API tùy chỉnh<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.custom" placeholder="Nhập địa chỉ API tùy chỉnh" />
      </el-col>
    </el-row>

    <!-- Cấu hình API mới -->
    <el-row v-show="compute.showNewAPI" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark" content="Nhập địa chỉ truy cập New API, ví dụ: http://localhost:3000" placement="top-start" :show-after="500">
          <span class="popup-text popup-vertical-left">API NewAPI<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.newApiUrl" placeholder="Nhập địa chỉ New API của bạn" />
      </el-col>
    </el-row>

    <!--  Mô hình -->
    <el-row v-show="compute.showModel" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <span class="popup-text popup-vertical-left">Mô hình</span>
      </el-col>
      <el-col :span="12">
        <el-select v-model="config.model[config.service]" placeholder="Chọn mô hình">
          <el-option class="select-left" v-for="item in compute.model" :key="item" :label="item" :value="item" />
        </el-select>
      </el-col>
    </el-row>

    <el-row v-show="compute.showCustomModel" class="margin-bottom margin-left-2em">
      <el-col :span="12" class="lightblue rounded-corner">
        <el-tooltip class="box-item" effect="dark"
          :content="config.service === 'doubao' ? 'Với Doubao, trường model là endpoint, xem tài liệu chính thức: https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint' : 'Lưu ý: tên mô hình tùy chỉnh phải trùng với tên do nhà cung cấp đưa ra, nếu không sẽ không dùng được!'"
          placement="top-start" :show-after="500">
          <span class="popup-text popup-vertical-left">{{ config.service === 'doubao' ? 'Endpoint' : 'Mô hình tùy chỉnh' }}<el-icon
              class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
        </el-tooltip>
      </el-col>
      <el-col :span="12">
        <el-input v-model="config.customModel[config.service]" placeholder="Ví dụ: gemma:7b" />
      </el-col>
    </el-row>

    <!-- Tùy chọn nâng cao-->
    <el-collapse class="margin-left-2em margin-bottom">
      <el-collapse-item title="Tùy chọn nâng cao">

        <!-- Giao diện -->
        <el-row class="margin-bottom margin-left-2em margin-top-2em">
          <el-col :span="12" class="lightblue rounded-corner">
            <span class="popup-text popup-vertical-left">Giao diện</span>
          </el-col>
          <el-col :span="12">
            <el-select v-model="config.theme" placeholder="Chọn chế độ giao diện">
              <el-option class="select-left" v-for="item in options.theme" :key="item.value" :label="item.label"
                         :value="item.value" />
            </el-select>
          </el-col>
        </el-row>

        <!-- Kích hoạt bộ nhớ đệm -->
        <el-row class="margin-bottom margin-left-2em">
          <el-col :span="20" class="lightblue rounded-corner">
            <el-tooltip class="box-item" effect="dark" content="Bật bộ nhớ đệm giúp dịch nhanh hơn và giảm yêu cầu lặp lại, nhưng có thể khiến kết quả không phải mới nhất" placement="top-start" :show-after="500">
        <span class="popup-text popup-vertical-left">Lưu đệm kết quả dịch<el-icon class="icon-margin">
            <ChatDotRound />
          </el-icon></span>
            </el-tooltip>
          </el-col>

          <el-col :span="4" class="flex-end">
            <el-switch v-model="config.useCache" inline-prompt active-text="Bật" inactive-text="Tắt"/>
          </el-col>
        </el-row>

        <!-- Bóng lơ lửng BậtTắt -->
      <el-row v-if="config.on" class="margin-bottom margin-left-2em margin-top-1em">
        <el-col :span="20" class="lightblue rounded-corner">
          <el-tooltip class="box-item" effect="dark" content="(Bản thử nghiệm) Bật/tắt bóng nổi dịch tức thời ở mép màn hình để dịch toàn bộ trang" placement="top-start" :show-after="500">
          <span class="popup-text popup-vertical-left">
            <!-- <span class="new-feature-badge">Mới</span> -->
            Bóng nổi dịch toàn trang
            <el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon>
          </span>
          </el-tooltip>
        </el-col>

        <el-col :span="4" class="flex-end">
          <el-switch v-model="floatingBallEnabled" inline-prompt active-text="Bật" inactive-text="Tắt" />
        </el-col>
      </el-row>


        <!-- Bảng tiến độ dịch -->
        <el-row class="margin-bottom margin-left-2em">
          <el-col :span="20" class="lightblue rounded-corner">
            <el-tooltip class="box-item" effect="dark"
                        content="Bảng tiến độ dịch (mặc định tắt): khi tắt sẽ không hiển thị bảng tiến độ ở góc dưới phải, phù hợp thiết bị di động hoặc người muốn ít bị làm phiền."
                        placement="top-start" :show-after="500">
          <span class="popup-text popup-vertical-left">Bảng tiến độ dịch<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
            </el-tooltip>
          </el-col>
          <el-col :span="4" class="flex-end">
          <el-switch v-model="config.translationStatus" inline-prompt active-text="Bật" inactive-text="Tắt" />
          </el-col>
        </el-row>

        <!-- Tắt cài đặt hoạt ảnh -->
        <el-row class="margin-bottom margin-left-2em">
          <el-col :span="20" class="lightblue rounded-corner">
            <el-tooltip class="box-item" effect="dark"
                        content="Hiệu ứng động (mặc định bật): khi tắt sẽ bỏ các hiệu ứng tải/di chuột để tiết kiệm GPU và pin, phù hợp máy cấu hình thấp hoặc muốn tiết kiệm tài nguyên."
                        placement="top-start" :show-after="500">
              <span class="popup-text popup-vertical-left">Hiệu ứng động<el-icon class="icon-margin">
                  <ChatDotRound />
                </el-icon></span>
            </el-tooltip>
          </el-col>
          <el-col :span="4" class="flex-end">
            <el-switch v-model="config.animations" inline-prompt active-text="Bật" inactive-text="Tắt" />
          </el-col>
        </el-row>

        <!-- Dịch trong hàm -->
        <el-row class="margin-bottom margin-left-2em">
          <el-col :span="12" class="lightblue rounded-corner">
            <el-tooltip class="box-item" effect="dark"
                        content="Dịch trong ô nhập: dùng cách kích hoạt đã chọn để dịch nội dung đang nhập ở bất kỳ ô văn bản nào."
                        placement="top-start" :show-after="500">
              <span class="popup-text popup-vertical-left">Dịch trong ô nhập<el-icon class="icon-margin">
                  <ChatDotRound />
                </el-icon></span>
            </el-tooltip>
          </el-col>
          <el-col :span="12">
            <el-select v-model="config.inputBoxTranslationTrigger" placeholder="Chọn cách kích hoạt">
              <el-option class="select-left" v-for="item in options.inputBoxTranslationTrigger" :key="item.value" 
                         :label="item.label" :value="item.value" />
            </el-select>
          </el-col>
        </el-row>

        <!-- Hộp đầu vào Đích dịch ngôn ngữ -->
        <el-row v-if="config.inputBoxTranslationTrigger !== 'disabled'" class="margin-bottom margin-left-2em">
          <el-col :span="12" class="lightblue rounded-corner">
            <span class="popup-text popup-vertical-left">Ngôn ngữ dịch đích</span>
          </el-col>
          <el-col :span="12">
            <el-select v-model="config.inputBoxTranslationTarget" placeholder="Chọn ngôn ngữ đích">
              <el-option class="select-left" v-for="item in options.inputBoxTranslationTarget" :key="item.value" 
                         :label="item.label" :value="item.value" />
            </el-select>
          </el-col>
        </el-row>

        <!-- Số tác vụ dịch đồng thời -->
        <el-row class="margin-bottom margin-left-2em">
          <el-col :span="12" class="lightblue rounded-corner">
            <el-tooltip class="box-item" effect="dark" content="Kiểm soát số tác vụ dịch chạy đồng thời. Số càng cao thì dịch càng nhanh nhưng có thể tốn nhiều tài nguyên hệ thống" placement="top-start"
                        :show-after="500">
          <span class="popup-text popup-vertical-left">Số tác vụ dịch đồng thời<el-icon class="icon-margin">
              <ChatDotRound />
            </el-icon></span>
            </el-tooltip>
          </el-col>
          <el-col :span="12">
            <el-input-number
                v-model="config.maxConcurrentTranslations"
                :min="1"
                :max="100"
                :step="1"
                style="width: 100%"
                @change="handleConcurrentChange"
                controls-position="right"
            />
          </el-col>
        </el-row>

        <!-- Sử dụng chuyển tiếp proxy -->
        <el-row v-show="compute.showProxy" class="margin-bottom margin-left-2em">
          <el-col :span="8" class="lightblue rounded-corner">
            <el-tooltip class="box-item" effect="dark" content="Dùng proxy có thể khắc phục lỗi không truy cập được mạng; nếu chưa quen cấu hình proxy thì để trống!" placement="top-start"
                        :show-after="500">
              <span class="popup-text popup-vertical-left">Địa chỉ proxy<el-icon class="icon-margin">
                  <ChatDotRound />
                </el-icon></span>
            </el-tooltip>
          </el-col>
          <el-col :span="16">
            <el-input v-model="config.proxy[config.service]" placeholder="Mặc định không dùng proxy" />
          </el-col>
        </el-row>

        <!-- Vai trò và mẫu -->
        <el-row v-show="compute.showAI" class="margin-bottom margin-left-2em">
          <el-col :span="8" class="lightblue rounded-corner">
            <el-tooltip class="box-item" effect="dark" content="Nội dung gửi với vai trò system, thường dùng để chỉ định vai trò AI."
              placement="top-start" :show-after="500">
              <span class="popup-text popup-vertical-left">system<el-icon class="icon-margin">
                  <ChatDotRound />
                </el-icon></span>
            </el-tooltip>
          </el-col>
          <el-col :span="16">
            <el-input type="textarea" v-model="config.system_role[config.service]" maxlength="8192"
              placeholder="system message " />
          </el-col>
        </el-row>
        <el-row v-show="compute.showAI" class="margin-bottom margin-left-2em">
          <el-col :span="8" class="lightblue rounded-corner">
            <el-tooltip class="box-item" effect="dark"
              content="Nội dung gửi với vai trò user, trong đó {{to}} là ngôn ngữ đích và {{origin}} là văn bản cần dịch; cả hai đều bắt buộc."
              placement="top-start" :show-after="500">
              <span class="popup-text popup-vertical-left">user<el-icon class="icon-margin">
                  <ChatDotRound />
                </el-icon></span>
            </el-tooltip>
          </el-col>
          <el-col :span="16">
            <el-input type="textarea" v-model="config.user_role[config.service]" maxlength="8192"
              placeholder="user message template" />
          </el-col>
        </el-row>
        <!-- Nút khôi phục mẫu mặc định -->
        <el-row v-show="compute.showAI" class="margin-bottom margin-left-2em">
          <el-col :span="24" style="text-align: right;">
            <el-button type="primary" link @click="resetTemplate">
              <el-icon>
                <Refresh />
              </el-icon>
              Khôi phục mẫu mặc định
            </el-button>
          </el-col>
        </el-row>

        <!-- Nhập và xuất cấu hình -->
        <el-row class="margin-bottom margin-left-2em">
          <el-col :span="24">
            <el-divider content-position="center">Quản lý cấu hình</el-divider>
          </el-col>
        </el-row>
        <el-row class="margin-bottom margin-left-2em">
          <el-col :span="12">
            <el-button type="primary" @click="handleExport">
              <el-icon>
                <Download />
              </el-icon>
              Xuất cấu hình
            </el-button>
          </el-col>
          <el-col :span="12">
            <el-button type="success" @click="handleImport">
              <el-icon>
                <Upload />
              </el-icon>
              Nhập cấu hình
            </el-button>
          </el-col>
        </el-row>

        <!-- Xuất cấu hình -->
        <el-row v-if="showExportBox" class="margin-bottom margin-left-2em">
          <el-col :span="24">
            <el-input v-model="exportData" type="textarea" :rows="8" readonly />
          </el-col>
        </el-row>

        <!-- Nhập cấu hình -->
        <el-row v-if="showImportBox" class="margin-bottom margin-left-2em">
          <el-col :span="24">
            <el-input v-model="importData" type="textarea" :rows="8" placeholder="Dán cấu hình JSON của bạn tại đây" />
            <div style="margin-top: 10px; text-align: right;">
              <el-button @click="saveImport">Lưu</el-button>
            </div>
          </el-col>
        </el-row>
      </el-collapse-item>
    </el-collapse>
    <!--    -->
  </div>

  <!-- Hộp thoại tùy chỉnh tắt phím -->
  <CustomHotkeyInput
    v-model="showCustomHotkeyDialog"
    :current-value="config.customFloatingBallHotkey"
    @confirm="handleCustomHotkeyConfirm"
    @cancel="handleCustomHotkeyCancel"
  />

  <!-- Tùy chỉnh hộp thoại Phím tắt rê chuột -->
  <CustomHotkeyInput
    v-model="showCustomMouseHotkeyDialog"
    :current-value="config.customHotkey"
    @confirm="handleCustomMouseHotkeyConfirm"
    @cancel="handleCustomMouseHotkeyCancel"
  />



</template>

<script lang="ts" setup>

// Thông tin cấu hình tay cầm chính
import { computed, ref, watch, onUnmounted } from 'vue'
import { models, options, servicesType, defaultOption } from "../entrypoints/utils/option";
import { Config } from "@/entrypoints/utils/model";
import { storage } from '@wxt-dev/storage';
import { ChatDotRound, Refresh, Edit, Upload, Download } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElInputNumber } from 'element-plus'
import browser from 'webextension-polyfill';
import { defineAsyncComponent } from 'vue';
const CustomHotkeyInput = defineAsyncComponent(() => import('@/components/CustomHotkeyInput.vue'));
import { parseHotkey } from '@/entrypoints/utils/hotkey';

// Khởi tạo truy vấn phương tiện ở chế độ tối
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

// Cập nhật chức năng chủ đề
function updateTheme(theme: string) {
  if (theme === 'auto') {
    // Ở chế độ tự động, sử dụng trực tiếp chủ đề hệ thống
    const isDark = darkModeMediaQuery.matches;
    console.log('isDark', isDark);

    document.documentElement.classList.toggle('dark', isDark);
  } else {
    // Ở chế độ thủ công, sử dụng chủ đề đã chọn
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

// Thông tin cấu hình
let config = ref(new Config());

// Nhận cấu hình cục bộ từ bộ lưu trữ
storage.getItem('local:config').then((value: any) => {
  if (typeof value === 'string' && value) {
    const parsedConfig = JSON.parse(value);
    Object.assign(config.value, parsedConfig);
  }
  // Chủ đề ứng dụng ban đầu
  updateTheme(config.value.theme || 'auto');
});

// Theo dõi các thay đổi trong 'local:config' trong bộ lưu trữ
// Trình nghe này sẽ được kích hoạt khi các trang khác sửa đổi cấu hình.
// newValue là giá trị cấu hình mới, oldValue là giá trị cấu hình cũ
storage.watch('local:config', (newValue: any, oldValue: any) => {
  // Kiểm tra xem newValue có phải là chuỗi không trống không
  if (typeof newValue === 'string' && newValue) {
    // Phân tích giá trị cấu hình mới thành một đối tượng và hợp nhất nó vào config.value hiện tại
    // Điều này giữ cho cấu hình của tất cả các trang được đồng bộ hóa
    Object.assign(config.value, JSON.parse(newValue));
  }
});

// Giám sát thay đổi cấu hình thanh menu
// Khi cấu hình thay đổi, cấu hình mới sẽ được tuần tự hóa thành chuỗi JSON và được lưu trữ trong bộ lưu trữ.
// deep: true có nghĩa là theo dõi sâu sắc những thay đổi về thuộc tính bên trong của đối tượng
watch(config, (newValue: any, oldValue: any) => {
  // TODO giám sát các thay đổi về cấu hình và hiển thị lời nhắc làm mới
  storage.setItem('local:config', JSON.stringify(newValue));
}, { deep: true });

// Thuộc tính tính toán
let compute = ref({
  // 1. Đây có phải là dịch vụ AI không?
  showAI: computed(() => servicesType.isAI(config.value.service)),
  // 2. Có phải Dịch máy không?
  showMachine: computed(() => servicesType.isMachine(config.value.service)),
  // 3. Có hiển thị tác nhân hay không
  showProxy: computed(() => servicesType.isUseProxy(config.value.service)),
  // 4. Có hiển thị Mô hình không
  showModel: computed(() => servicesType.isUseModel(config.value.service)),
  // 5. Có hiển thị mã thông báo hay không
  showToken: computed(() => servicesType.isUseToken(config.value.service)),
  // 6. Có hiển thị AkSk không
  showAkSk: computed(() => servicesType.isUseAkSk(config.value.service)),
  // 6.5. Có hiển thị cấu hình Youdao Dịch hay không
  showYoudao: computed(() => servicesType.isYoudao(config.value.service)),
  // 6.6. Có hiển thị cấu hình máy Tencent Cloud Dịch hay không
  showTencent: computed(() => servicesType.isTencent(config.value.service)),
  // 7. Lấy danh sách Mô Hình
  model: computed(() => models.get(config.value.service) || []),
  // 8. Bạn có cần tùy chỉnh API không?
  showCustom: computed(() => servicesType.isCustom(config.value.service)),
  // 9. Có hiển thị cấu hình URL DeepLX hay không
  showDeepLX: computed(() => config.value.service === 'deeplx'),
  // 10. Tùy chỉnh mô hình
  showCustomModel: computed(() => servicesType.isAI(config.value.service) && config.value.model[config.value.service] === "Mô hình tùy chỉnh"),
  // 11. Xác định xem đó có phải là "chế độ song ngữ" hay không và kiểm soát việc hiển thị một số Dịch vụ dịch vụ
  filteredServices: computed(() => options.services.filter((service: any) =>
    !([service.google].includes(service.value) && config.value.display !== 1))
  ),
  // 12. Xác định xem đó có phải là coze không
  showRobotId: computed(() => servicesType.isCoze(config.value.service)),
  // 13. Có hiển thị cấu hình API mới hay không
  showNewAPI: computed(() => servicesType.isNewApi(config.value.service)),
  // 14. Có hiển thị cấu hình điểm cuối Azure OpenAI hay không
  showAzureOpenaiEndpoint: computed(() => servicesType.isAzureOpenai(config.value.service)),
})

// Theo dõi thay đổi chủ đề
watch(() => config.value.theme, (newTheme) => {
  updateTheme(newTheme || 'auto');
});

// Sử dụng onchange để theo dõi các thay đổi của chủ đề hệ thống
darkModeMediaQuery.onchange = (e) => {
  if (config.value.theme === 'auto') {
    updateTheme('auto');
  }
};

// Dọn dẹp khi các thành phần được gỡ cài đặt
onUnmounted(() => {
  darkModeMediaQuery.onchange = null;
});

// Nhóm kiểu tính toán
const styleGroups = computed(() => {
  const groups = options.styles.filter(item => item.disabled);
  return groups.map(group => ({
    ...group,
    options: options.styles.filter(item => !item.disabled && item.group === group.value)
  }));
});

// Khôi phục mẫu mặc định
const resetTemplate = () => {
  ElMessageBox.confirm(
    'Bạn có chắc muốn khôi phục mẫu system và user mặc định không? Thao tác này sẽ ghi đè mẫu tùy chỉnh hiện tại.',
    'Khôi phục mẫu mặc định',
    {
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Hủy',
      type: 'warning',
    }
  ).then(() => {
    config.value.system_role[config.value.service] = defaultOption.system_role;
    config.value.user_role[config.value.service] = defaultOption.user_role;
    ElMessage({
      message: 'Đã khôi phục mẫu dịch mặc định thành công',
      type: 'success',
      duration: 2000
    });
  }).catch(() => {
    // Người dùng Hủy hoạt động mà không cần xử lý
  });
};

// Tính chất của quả bóng lơ lửng BậtTắt
const floatingBallEnabled = computed({
  get: () => !config.value.disableFloatingBall && config.value.on,
  set: (value) => {
    config.value.disableFloatingBall = !value;
    // Gửi tin nhắn đến tất cả các tab đang hoạt động
    browser.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, { 
            type: 'toggleFloatingBall',
            isEnabled: value 
          }).catch(() => {
            // Bỏ qua lỗi không gửi được (có thể trang chưa tải script nội dung)
          });
        }
      });
    });
  }
});

// Theo dõi sự thay đổi của từ Chế độ dịch
watch(() => config.value.selectionTranslatorMode, (newMode) => {
  // Gửi tin nhắn đến tất cả các tab đang hoạt động
  browser.tabs.query({}).then(tabs => {
    tabs.forEach(tab => {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, { 
          type: 'updateSelectionTranslatorMode',
          mode: newMode 
        }).catch(() => {
          // Bỏ qua lỗi không gửi được (có thể trang chưa tải script nội dung)
        });
      }
    });
  });
});

// Theo dõi các thay đổi Kích hoạt
const handleSwitchChange = () => {
  showRefreshTip.value = true;
};

// Xử lý các thay đổi của tiện ích trạng thái
const handlePluginStateChange = (val: boolean) => {
  // Nếu plugin bị Tắt, hãy đảm bảo rằng bóng lơ lửng và lựa chọn Dịch khi bôi cũng bị Tắt
  if (!val) {
    // Xử lý bóng lơ lửng
    if (!config.value.disableFloatingBall) {
      config.value.disableFloatingBall = true;
      // Gửi tin nhắn tới tất cả các tab đang hoạt động, Tắt bóng nổi
      browser.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
          if (tab.id) {
            browser.tabs.sendMessage(tab.id, { 
              type: 'toggleFloatingBall',
              isEnabled: false
            }).catch(() => {
              // Bỏ qua lỗi không gửi được (có thể trang chưa tải script nội dung)
            });
          }
        });
      });
    }
    
    // Đang xử lý dịch khi lựa chọn
    if (config.value.selectionTranslatorMode !== 'disabled') {
      config.value.selectionTranslatorMode = 'disabled';
      // Gửi tin nhắn đến tất cả các tab đang hoạt động, Tắt Dịch khi bôi chọn
      browser.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
          if (tab.id) {
            browser.tabs.sendMessage(tab.id, { 
              type: 'updateSelectionTranslatorMode',
              mode: 'disabled'
            }).catch(() => {
              // Bỏ qua lỗi không gửi được (có thể trang chưa tải script nội dung)
            });
          }
        });
      });
    }
  }
};

// Xử lý các thay đổi của bóng treo.
const toggleFloatingBall = (val: boolean) => {
  // Gửi tin nhắn đến tất cả các tab đang hoạt động
  browser.tabs.query({}).then(tabs => {
    tabs.forEach(tab => {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, { 
          type: 'toggleFloatingBall',
          isEnabled: val 
        }).catch(() => {
          // Bỏ qua lỗi không gửi được (có thể trang chưa tải script nội dung)
        });
      }
    });
  });
};

// Phím tắt tùy chọn Offphase
const showCustomHotkeyDialog = ref(false);
const showCustomMouseHotkeyDialog = ref(false);

// Cấu hình giai đoạn nhập và xuất Tắt
const showExportConfig = ref(false);
const showImportConfig = ref(false);
const exportedConfig = ref('');
const importConfigText = ref('');
const importLoading = ref(false);

// Xử lý các thay đổi lựa chọn phím tắt
const handleHotkeyChange = (value: string) => {
  if (value === 'custom') {
    // Sau khi chọn Custom, nếu chưa cài đặt tùy chọn Tắt tùy chọn, hộp thoại cài đặt Mở tự động sẽ xuất hiện.
    if (!config.value.customFloatingBallHotkey) {
      // Trì hoãn một lúc để hộp lựa chọn hoàn tất cập nhật trạng thái trước
      setTimeout(() => {
        openCustomHotkeyDialog();
      }, 100);
    }
  }
};

// OpenPhímtắt hộp thoại tùy chỉnh
const openCustomHotkeyDialog = () => {
  showCustomHotkeyDialog.value = true;
};

// Xác nhậnPhím tắt tùy chỉnh
const handleCustomHotkeyConfirm = (hotkey: string) => {
  config.value.customFloatingBallHotkey = hotkey;
  config.value.floatingBallHotkey = 'custom';
  
  ElMessage({
    message: hotkey === 'none' ? 'Đã tắt phím tắt' : `Đã đặt phím tắt: ${getCustomHotkeyDisplayName()}`,
    type: 'success',
    duration: 2000
  });
};

// HủyPhím tắt tùy chỉnh
const handleCustomHotkeyCancel = () => {
  // Nếu không có tùy chọn tắt Phím tắt thì quay lại tùy chọn mặc định
  if (!config.value.customFloatingBallHotkey) {
    config.value.floatingBallHotkey = 'Alt+T';
  }
};

// Nhận tên hiển thị tùy chỉnh tắt Key
const getCustomHotkeyDisplayName = () => {
  if (!config.value.customFloatingBallHotkey) return '';
  
  if (config.value.customFloatingBallHotkey === 'none') {
    return 'Đã tắt';
  }
  
  const parsed = parseHotkey(config.value.customFloatingBallHotkey);
  return parsed.isValid ? parsed.displayName : config.value.customFloatingBallHotkey;
};

// Xử lý các thay đổi lựa chọn chuột tắt rê
const handleMouseHotkeyChange = (value: string) => {
  if (value === 'custom') {
    // Sau khi chọn Custom, nếu chưa cài đặt tùy chọn Tắt tùy chọn, hộp thoại cài đặt Mở tự động sẽ xuất hiện.
    if (!config.value.customHotkey) {
      // Trì hoãn một lúc để hộp lựa chọn hoàn tất cập nhật trạng thái trước
      setTimeout(() => {
        openCustomMouseHotkeyDialog();
      }, 100);
    }
  }
};

// MởTùy chỉnh hộp thoại Phím tắt rê chuột
const openCustomMouseHotkeyDialog = () => {
  showCustomMouseHotkeyDialog.value = true;
};

// Xác nhận chuột tắt phím tùy chỉnh
const handleCustomMouseHotkeyConfirm = (hotkey: string) => {
  config.value.customHotkey = hotkey;
  config.value.hotkey = 'custom';
  
  ElMessage({
    message: hotkey === 'none' ? 'Đã tắt phím tắt' : `Đã đặt phím tắt: ${getCustomMouseHotkeyDisplayName()}`,
    type: 'success',
    duration: 2000
  });
};

// Hủy bỏ chuột tắt phím tùy chỉnh
const handleCustomMouseHotkeyCancel = () => {
  // Nếu không có tùy chọn tắt Phím tắt thì quay lại tùy chọn mặc định
  if (!config.value.customHotkey) {
    config.value.hotkey = 'Control';
  }
};

// Lấy tên hiển thị chuột tắt rê phím tùy chỉnh
const getCustomMouseHotkeyDisplayName = () => {
  if (!config.value.customHotkey) return '';
  
  if (config.value.customHotkey === 'none') {
    return 'Đã tắt';
  }
  
  const parsed = parseHotkey(config.value.customHotkey);
  return parsed.isValid ? parsed.displayName : config.value.customHotkey;
};

// Xử lý các thay đổi số đồng thời
const handleConcurrentChange = (currentValue: number | undefined, oldValue: number | undefined) => {
  // Xác minh tính hợp lệ của số đồng thời
  if (currentValue === undefined || currentValue < 1 || currentValue > 100) {
    ElMessage({
      message: 'Số lượng đồng thời phải nằm trong khoảng 1-100',
      type: 'warning',
      duration: 2000
    });
    // Khôi phục mặc định
    config.value.maxConcurrentTranslations = 6;
    return;
  }
  
  // Hiển thị thông báo rằng cài đặt đã được cập nhật
  showRefreshTip.value = true;
  
  ElMessage({
    message: `Đã cập nhật số lượng đồng thời thành ${currentValue}`,
    type: 'success',
    duration: 2000
  });
};

// Hiển thị lời nhắc làm mới
const showRefreshTip = ref(false);

// Làm mới trang
const refreshPage = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) {
    browser.tabs.reload(tabs[0].id);
    showRefreshTip.value = false; // Ẩn lời nhắc sau khi làm mới
  }
};

const showExportBox = ref(false);
const exportData = ref('');
const showImportBox = ref(false);
const importData = ref('');

// Chức năng xác minh địa chỉ điểm cuối Azure OpenAI
const isValidAzureEndpoint = (endpoint: string) => {
  if (!endpoint || endpoint.trim() === '') {
    return false;
  }

  // Kiểm tra xem các thành phần cần thiết có được bao gồm không
  const hasAzureDomain = endpoint.includes('openai.azure.com');
  const hasChatCompletions = endpoint.includes('/chat/completions');
  const hasHttps = endpoint.startsWith('https://');

  return hasHttps && hasAzureDomain && hasChatCompletions;
};

const handleExport = async () => {
  const configStr = await storage.getItem('local:config');
  if (!configStr) {
    ElMessage({
      message: 'Không tìm thấy thông tin cấu hình',
      type: 'warning',
    });
    return;
  }

  const configToExport = JSON.parse(configStr as string);

  // Create a deep copy to avoid modifying the actual config
  const cleanedConfig = JSON.parse(JSON.stringify(configToExport));

  // Clean system_role and user_role if they are default
  if (cleanedConfig.system_role) {
    for (const service in cleanedConfig.system_role) {
      if (cleanedConfig.system_role[service] === defaultOption.system_role) {
        delete cleanedConfig.system_role[service];
      }
    }
    if (Object.keys(cleanedConfig.system_role).length === 0) {
      delete cleanedConfig.system_role;
    }
  }

  if (cleanedConfig.user_role) {
    for (const service in cleanedConfig.user_role) {
      if (cleanedConfig.user_role[service] === defaultOption.user_role) {
        delete cleanedConfig.user_role[service];
      }
    }
    if (Object.keys(cleanedConfig.user_role).length === 0) {
      delete cleanedConfig.user_role;
    }
  }

  exportData.value = JSON.stringify(cleanedConfig, null, 2);
  showExportBox.value = !showExportBox.value;
  showImportBox.value = false;
};

const handleImport = () => {
  showImportBox.value = !showImportBox.value;
  showExportBox.value = false;
};

const saveImport = async () => {
  try {
    const parsedConfig = JSON.parse(importData.value);
    // Add validation here
    if (!validateConfig(parsedConfig)) {
      ElMessage({
        message: 'Cấu hình không hợp lệ hoặc sai định dạng, vui lòng kiểm tra!',
        type: 'error',
      });
      return;
    }
    await storage.setItem('local:config', JSON.stringify(parsedConfig));
    ElMessage({
      message: 'Nhập cấu hình thành công!',
      type: 'success',
    });
    showImportBox.value = false;
    importData.value = '';
    // Optionally, reload the extension or relevant parts
  } catch (e) {
    ElMessage({
      message: 'Định dạng cấu hình không đúng, vui lòng kiểm tra!',
      type: 'error',
    });
  }
};


// Switch Xuất màn hình cấu hình
const toggleExportConfig = async () => {
  if (showExportConfig.value) {
    // Ẩn nếu đã hiển thị
    showExportConfig.value = false;
    exportedConfig.value = '';
  } else {
    // Nếu không hiển thị, hiển thị và tạo cấu hình
    try {
      // Đảm bảo nhận được cấu hình mới nhất từ ​​bộ lưu trữ
      const latestConfig = await storage.getItem('local:config');
      let configToExport;

      if (latestConfig && typeof latestConfig === 'string') {
        // Sử dụng cấu hình mới nhất trong bộ lưu trữ
        configToExport = JSON.parse(latestConfig);
      } else {
        // Nếu nó không có trong bộ lưu trữ, hãy sử dụng config.value hiện tại
        configToExport = JSON.parse(JSON.stringify(config.value));
      }

      exportedConfig.value = JSON.stringify(configToExport, null, 2);
      showExportConfig.value = true;

      ElMessage({
        message: 'Đã tạo cấu hình, vui lòng sao chép để lưu',
        type: 'success',
        duration: 2000
      });
    } catch (error) {
      ElMessage({
         message: 'Xuất cấu hình thất bại: ' + ((error as Error)?.message || 'Lỗi không xác định'),
         type: 'error',
         duration: 3000
       });
    }
  }
};

// Sao chép cấu hình đã xuất vào clipboard
const copyExportedConfig = async () => {
  try {
    await navigator.clipboard.writeText(exportedConfig.value);
    ElMessage({
      message: 'Đã sao chép cấu hình vào bộ nhớ tạm',
      type: 'success',
      duration: 2000
    });
  } catch (error) {
    ElMessage({
      message: 'Sao chép thất bại, vui lòng sao chép thủ công',
      type: 'warning',
      duration: 2000
    });
  }
};

// Chuyển đổi Nhập cấu hình hiển thị
const toggleImportConfig = () => {
  if (showImportConfig.value) {
    // Nếu đã hiển thị thì ẩn và xóa nội dung
    showImportConfig.value = false;
    importConfigText.value = '';
  } else {
    // nếu không hiển thị thì hiển thị
    showImportConfig.value = true;
    importConfigText.value = '';
  }
};

// Hủy nhập khẩu
const cancelImport = () => {
  // Xóa hộp nhập và ẩn vùng nhập
  importConfigText.value = '';
  showImportConfig.value = false;
  importLoading.value = false;
};

// Nhập cấu hình
const importConfig = async () => {
  if (!importConfigText.value.trim()) {
    ElMessage({
      message: 'Vui lòng nhập nội dung cấu hình',
      type: 'warning',
      duration: 2000
    });
    return;
  }

  importLoading.value = true;

  try {
    // Phân tích cấu hình JSON
    const importedConfig = JSON.parse(importConfigText.value);

    // Xác minh định dạng cấu hình
    if (!validateConfig(importedConfig)) {
      throw new Error('Định dạng cấu hình không đúng');
    }

    // Xác nhận nhập
    await ElMessageBox.confirm(
      'Nhập cấu hình sẽ ghi đè toàn bộ cài đặt hiện tại, bạn có chắc muốn tiếp tục không?',
      'Xác nhận nhập',
      {
        confirmButtonText: 'Xác nhận nhập',
        cancelButtonText: 'Hủy',
        type: 'warning',
      }
    );

    // Áp dụng cấu hình mới
    Object.assign(config.value, importedConfig);

    // Lưu vào kho lưu trữ
    await storage.setItem('local:config', JSON.stringify(config.value));

    // Ẩn khu vực nhập và xóa đầu vào
    showImportConfig.value = false;
    importConfigText.value = '';

    ElMessage({
      message: 'Nhập cấu hình thành công',
      type: 'success',
      duration: 2000
    });

  } catch (error) {
    if ((error as Error).message !== 'cancel') {
      ElMessage({
        message: 'Nhập thất bại: ' + ((error as Error).message || 'Lỗi định dạng cấu hình'),
        type: 'error',
        duration: 3000
      });
    }
  } finally {
    importLoading.value = false;
  }
};

// Xác minh định dạng cấu hình
const validateConfig = (configData: any): boolean => {
  try {
    // Kiểm tra xem nó có phải là một đối tượng không
    if (typeof configData !== 'object' || configData === null) {
      return false;
    }

    // Kiểm tra các trường cấu hình cần thiết
    const requiredFields = ['on', 'service', 'display', 'from', 'to'];
    for (const field of requiredFields) {
      if (!(field in configData)) {
        return false;
      }
    }

    // Kiểm tra cấu hình dịch vụ
    if (typeof configData.service !== 'string') {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

</script>

<style scoped>

.select-left {
  text-align: left;
}

.flex-end {
  display: flex;
  justify-content: flex-end;
}

.select-divider {
  background: #f2f6fc;
  color: #409eff;
  font-size: 12px;
  padding: 4px 12px;
  cursor: default;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-bottom: 1px solid #e4e7ed;
  margin: 4px 0;
  pointer-events: none;
  opacity: 0.9;
}

.icon-margin {
  margin-left: 0.25em;
}

/* Thêm kiểu thích ứng */
:deep(.el-select) {
  width: 100%;
}

:deep(.el-input) {
  width: 100%;
}

.margin-bottom {
  margin-bottom: 10px;
}

.margin-left-2em {
  margin-left: 1em;
  margin-right: 1em;
}

.margin-top-2em {
  margin-top: 1em;
}

.margin-top-1em {
  margin-top: 0.5em;
}

/* Đặt kiểu thanh cuộn */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.refresh-tip {
  margin: 0 1em;
}

.refresh-button {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5em 1em;
  color: #fff;
  background-color: #409eff;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}

.refresh-button:hover {
  background-color: #66b1ff;
  color: #fff;
}

.new-feature-badge {
  display: inline-block;
  font-size: 12px;
  background-color: #f56c6c;
  color: white;
  padding: 1px 6px;
  border-radius: 10px;
  margin-right: 8px;
  font-weight: bold;
  animation: bounce 1s infinite alternate;
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  }
  100% {
    box-shadow: 0 2px 12px rgba(64, 158, 255, 0.5);
  }
}

@keyframes bounce {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-3px);
  }
}

/* Phím tắt tùy chỉnh kiểu Tắt pha */
.hotkey-config {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.custom-hotkey-display {
  display: flex;
  align-items: center;
  padding: 6px 6px 6px 10px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 4px;
  font-size: 12px;
  height: 32px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.hotkey-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-weight: 600;
  color: var(--el-color-primary);
  font-size: 13px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: calc(100% - 32px);
}

.edit-button {
  padding: 2px 4px;
  margin-left: 4px;
  color: var(--el-color-primary);
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-button:hover {
  background: var(--el-color-primary-light-8);
}

.edit-button .el-icon {
  font-size: 12px;
}

.placeholder-text {
  color: var(--el-text-color-placeholder) !important;
  font-style: italic;
  font-family: inherit !important;
  font-weight: normal !important;
}

/* Phím tắt kiểu dòng tùy chỉnh */
.custom-hotkey-row {
  border-radius: 8px;
  padding: 8px;
  margin: 6px 0 !important;
  background: linear-gradient(135deg, 
    rgba(64, 158, 255, 0.03) 0%, 
    rgba(64, 158, 255, 0.01) 50%, 
    rgba(103, 194, 58, 0.02) 100%);
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid transparent;
}

.custom-hotkey-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(64, 158, 255, 0.2) 0%, 
    rgba(64, 158, 255, 0.1) 30%,
    rgba(103, 194, 58, 0.1) 70%,
    rgba(103, 194, 58, 0.2) 100%);
  border-radius: 8px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.custom-hotkey-row::after {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  background: linear-gradient(135deg, 
    rgba(64, 158, 255, 0.3), 
    rgba(103, 194, 58, 0.3));
  border-radius: 8px;
  z-index: -2;
  opacity: 0.6;
}

.custom-hotkey-row:hover {
  background: linear-gradient(135deg, 
    rgba(64, 158, 255, 0.05) 0%, 
    rgba(64, 158, 255, 0.03) 50%, 
    rgba(103, 194, 58, 0.04) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.custom-hotkey-row:hover::before {
  opacity: 0.1;
}

/* Huy hiệu logo tùy chỉnh */
.custom-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  background: var(--el-color-primary);
  color: white;
  font-size: 10px;
  border-radius: 10px;
  font-weight: 500;
  margin-left: 6px;
  line-height: 1;
}

/* sai phong cách */
.input-error {
  border-color: var(--el-color-danger) !important;
}

.input-error:focus {
  border-color: var(--el-color-danger) !important;
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.2) !important;
}

.error-text {
  color: var(--el-color-danger);
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
}
</style>
