<script>
  let user = true;

  // Temporary array.
  let links = [
    {
      id: 0,
      title: "About",
      url: '/'
    },
    {
      id: 1,
      title: "Use Cases",
      url: '/'
    },
    {
      id: 2,
      title: "Source Code",
      url: '/'
    }
  ];
</script>

<svelte:head>
	<link rel="stylesheet" href="./fonts/Junegull/junegull.css">
</svelte:head>

<!-- 
  Main content
 -->
<main class="w-full">
  <!-- Header -->
  <div class="absolute inset-x-0 top-0 w-full flex justify-between px-2 md:px-6 lg:px-12 py-4 lg:py-6">
    <!-- Logotype -->
    <div class="items-center">
      <h1 style="font-family: Junegull;" class="text-xl">wavees</h1>
      <p class="text-sm text-gray-700">Tunnels</p>
    </div>

    <!-- Header items -->
    <div class="flex items-center">

      <!-- Links (available only on huge screens) -->
      <div class="hidden md:flex">
        {#each links as link}
          <a class="mx-6 text-sm" href="{link.url}">{link.title}</a>
        {/each}
      </div>

      {#if user}
        <!-- User Account -->
        <div class="hidden md:flex items-center mx-6">
          <div class="flex items-center">
            <!-- Avatar -->
            <div style="background: url('https://media.discordapp.net/attachments/661496619249696769/736637982513037312/945e599c-3a1e-44d5-a23e-d6acc2ca47a5.jpg')" class="w-8 h-8 rounded-full"></div>

            <!-- Some information -->
            <div class="items-center mx-2">
              <h1 class="text-sm">Soglacen</h1>
              <p class="text-xs text-gray-800">soglacen@gmail.com</p>
            </div>
          </div>

          <!-- Some buttons -->
          <div class="flex mx-4">
            <button class="px-4 py-2 text-xs rounded-full bg-blue-400 hover:bg-blue-600 shadow-md text-white">
              Panel
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Page's Hero -->
  <div style="min-height: 100vh;" class="bg-gray-200 w-full flex justify-center flex-col md:flex-row items-center pt-24 md:pt-0">
    <!-- Text -->
    <div class="w-full md:w-1/3 text-center px-4 md:px-0">
      <h1 class="text-3xl font-semibold">Expose your projects</h1>
      <p class="text-sm text-gray-800 mt-2">Wavees Tunnels is a yet simple and fully free service for tunneling http/https and tcp from localhost to outter internet.</p>

      <!-- Buttons -->
      <div class="flex flex-col md:flex-row mt-6 px-8 md:px-0">
        <!-- Documentation Link -->
        <button class="shadow-md w-full px-6 py-2 md:mx-4 bg-blue-400 hover:bg-blue-600 text-white rounded-full">
          Documentation
        </button>

        <!-- Servers Locations Link -->
        <button class="mt-6 md:mt-0 w-full px-6 py-2 md:mx-4 text-sm flex justify-center items-center">
          <img class="mx-2 hidden md:block" style="width: 1.2rem;" src="./icons/globe.svg" alt="Globe Icon">
          Servers location
        </button>
      </div>
    </div>
  </div>

  <!-- Small usage guide -->
  <div class="w-full pt-6 md:pt-24 px-2 md:px-8 lg:px-12 flex flex-col-reverse md:flex-col">

    <div class="flex flex-col md:flex-row">
      <!-- 
        Card: SignUp (optional)
      -->
      <div class="w-full md:w-1/3 relative px-4">
        <!-- Card Header -->
        <div class="w-full flex items-center justify-between">
          <div class="flex items-start">
            <!-- Step number -->
            <div class="rounded-full w-8 h-8 bg-white p-1 text-center text-black text-sm font-semibold">
              1.
            </div>

            <!-- Optional badge -->
            <span class="mx-2 text-xs">
              *Optional step
            </span>
          </div>

          <!-- Step State -->
          <div>
            <span style="width: 1.2rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
          </div>
        </div>

        <!-- Card itself -->
        <div class="w-full bg-gray-100 shadow-md rounded-lg mt-4 py-8 lg:py-16 px-6">
          <!-- Title -->
          <h1 class="text-3xl font-semibold">User Account</h1>

          <!-- Step description -->
          <div class="mt-2 text-gray-800 text-sm">
            <p>To make it much more convenient for you to manage your tunnels, we offer you to log in using Wavees services.</p>
          </div>

          <!-- Buttons -->
          <div class="mt-6">
            {#if user}
              <h1 class="text-2xl font-semibold">Current user:</h1>
              <p class="text-gray-700 text-xs">And yes, you can change it anytime!</p>

              <div class="flex justify-between mt-4 items-center">
                <div class="flex items-center">
                  <!-- Avatar -->
                  <div style="background: url('https://media.discordapp.net/attachments/661496619249696769/736637982513037312/945e599c-3a1e-44d5-a23e-d6acc2ca47a5.jpg')" class="w-8 h-8 rounded-full"></div>

                  <!-- Some information -->
                  <div class="items-center mx-2">
                    <h1 class="text-sm">Soglacen</h1>
                    <p class="text-xs text-gray-800">soglacen@gmai...</p>
                  </div>
                </div>

                <!-- Some buttons -->
                <button class="px-4 py-2 text-xs rounded-full bg-blue-400 hover:bg-blue-600 shadow-md text-white">
                  Change
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- 
        Card: Create new Tunnel
      -->
      <div class="w-full md:w-1/3 my-6 md:my-0 relative px-4">
        <!-- Card Header -->
        <div class="w-full flex items-center justify-between">
          <div class="flex items-start">
            <!-- Step number -->
            <div class="rounded-full w-8 h-8 bg-white p-1 text-center text-black text-sm font-semibold">
              2.
            </div>
          </div>

          <!-- Step State -->
          <div>
          </div>
        </div>

        <!-- Card itself -->
        <div class="w-full bg-gray-100 shadow-md rounded-lg mt-4 py-6 py-8 lg:py-16 px-6">
          <!-- Title -->
          <h1 class="text-3xl font-semibold">Create new Tunnel</h1>

          <!-- Step description -->
          <div class="mt-2 text-gray-800 text-sm">
            <p></p>
          </div>

          <!-- Buttons -->
          <div class="mt-6">

          </div>
        </div>
      </div>

      <!-- 
        Card: Connect to http/https/tcp tunnel
      -->
      <div class="w-full md:w-1/3 my-6 md:my-0 relative px-4">
        <!-- Card Header -->
        <div class="w-full flex items-center justify-between">
          <div class="flex items-start">
            <!-- Step number -->
            <div class="rounded-full w-8 h-8 bg-white p-1 text-center text-black text-sm font-semibold">
              3.
            </div>
          </div>

          <!-- Step State -->
          <div>
          </div>
        </div>

        <!-- Card itself -->
        <div class="w-full bg-gray-100 shadow-md rounded-lg mt-4 py-6 py-8 lg:py-16 px-6">
          <!-- Title -->
          <h1 class="text-3xl font-semibold">Connect to Tunnel</h1>

          <!-- Step description -->
          <div class="mt-2 text-gray-800 text-sm">
            <p></p>
          </div>

          <!-- Code block -->
          <div class="mt-6">
            
          </div>
        </div>
      </div>
    </div>

    <!-- Different Tutorials -->
    <div class="my-6 md:mt-12 w-full flex flex-col md:flex-row justify-center">

      <!-- Hard tutorial -->
      <div class="mt-6 md:my-0 mx-6 border-b-2 border-blue-400 py-4 px-2">
        <h1 class="text-xl font-semibold">Usage: Hard tutorial</h1>
        <p class="text-xs text-gray-800">using built-in Net module</p>
      </div>

      <!-- Easy tutorial -->
      <div class="mt-6 md:my-0 mx-6 py-4 px-2">
        <h1 class="text-xl">Usage: Easy Tutorial</h1>
        <p class="text-xs text-gray-800">using our hand-made client package</p>
      </div>

    </div>
  </div>

  <!-- About Other Developer-Related Services -->
  <div class="w-full bg-gray-100 py-6 md:py-24 lg:py-32 flex flex-col md:flex-row justify-center items-center">
    <div class="w-full md:w-2/4 text-center px-4 md:px-6">
      <h1 class="text-3xl font-semibold">Take a little Sneak Peak on our Developer-related services</h1>
      <p class="text-gray-700 text-sm mt-4">All these services are made especially for web developers and are completely free! All these services are made especially for web developers and are completely free.</p>
    
      <!-- Some buttons -->
      <div class="mt-8 w-full flex flex-col md:flex-row justify-center">
        <!-- More services -->
        <button class="shadow-md w-full px-6 py-2 md:mx-4 bg-blue-400 hover:bg-blue-600 text-white rounded-full">
          More Services
        </button>

        <!-- Documentation -->
        <button class="mt-6 md:mt-0 w-full px-6 py-2 md:mx-4 text-sm flex justify-center items-center">
          <img class="mx-2 hidden md:block" style="width: 1.2rem;" src="./icons/book.svg" alt="Book Icon">
          Documentation
        </button>
      </div>
    </div>

    <!-- 
      A little Sneak Peak on our
      Services -->
    <div class="flex justify-center flex-wrap w-full mt-12 md:mt-0">
      <!-- Authorization Services -->
      <div class="mx-4 my-4 w-64 h-64 bg-white shadow-xl rounded-lg">
      
      </div>

      <!-- Database -->
      <div class="mx-4 my-4 w-64 h-64 bg-white shadow-xl rounded-lg">
      
      </div>

      <!-- Splash Hosting -->
      <div class="mx-4 my-4 w-64 h-64 bg-white shadow-xl rounded-lg">
      
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="w-full flex justify-between px-4 md:px-8 lg:px-12 py-6">
    <!-- Wavees Logotype -->
    <div>
      <h1 style="font-family: Junegull;" class="text-xl">wavees</h1>
      <p class="text-gray-700 text-xs">Company</p>
    </div>

    <!-- Some links -->
    <div class="flex items-center">
      <!-- Small links -->
      <div class="hidden md:block mx-2 text-gray-700 text-xs">
        <a class="mx-4" href="https://wavees.ml">All Services</a>
        <a class="mx-4" href="https://github.com/wavees/tunnels">Source Code</a>
      </div>

      <!-- "Learn more About Company" Button -->
      <div class="hidden lg:block mx-6 text-sm">
        <button class="shadow-md w-full px-6 py-2 bg-blue-400 hover:bg-blue-600 text-white rounded-full">
          Learn more about Company
        </button>
      </div>

      <!-- Copyright -->
      <div class="mx-6 text-xs">
        © Wavees Company, 2020
      </div>
    </div>
  </div>
</main>