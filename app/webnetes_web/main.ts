import { Weblet } from "../../lib/management/weblet";
import { WebnetesManager } from "../../lib/management/webnetes-manager";
import { IResource } from "../../lib/models/resource";

(window as any).setImmediate = window.setInterval; // Polyfill

const params = new URLSearchParams(window.location.search);
const isManager = params.get("manager");

if (isManager) {
  const mgr = new WebnetesManager(
    {
      iceServers: [
        {
          urls: "stun:global.stun.twilio.com:3478?transport=udp",
        },
        {
          username:
            "f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be9c27212d",
          urls: "turn:global.turn.twilio.com:3478?transport=udp",
          credential: "w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw=",
        },
        {
          username:
            "f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be9c27212d",
          urls: "turn:global.turn.twilio.com:3478?transport=tcp",
          credential: "w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw=",
        },
        {
          username:
            "f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be9c27212d",
          urls: "turn:global.turn.twilio.com:443?transport=tcp",
          credential: "w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw=",
        },
      ],
    },
    "wss://unisockets.herokuapp.com",
    1000,
    "10.1.1",
    async (id: string) => {
      console.log("Node joined", id);

      if (params.get("sender")) {
        await new Promise((res) => setTimeout(res, 1000));

        await mgr.modifyResources(
          [
            {
              apiVersion: "webnetes.felix.pojtinger.com/v1alpha1",
              kind: "Runtime",
              metadata: {
                name: "Generic WASI",
                label: "wasi_generic",
              },
            },
          ] as IResource<any>[],
          id,
          false
        );
      }
    },
    async (id: string) => {
      console.log("Node left", id);
    },
    async (id: string, resources: IResource<any>[], remove: boolean) => {
      // TODO: Only handle for pre-set ID ("access token")
      console.log(
        "Modification request from",
        id,
        "received, handling modification remove=",
        remove,
        "to resources",
        resources
      );
    }
  );

  (async () => {
    await mgr.open();
  })();
} else {
  const resourcesToCreate = `apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Runtime
metadata:
  name: Generic WASI
  label: wasi_generic
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Runtime
metadata:
  name: TinyGo WASI
  label: wasi_tinygo
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Runtime
metadata:
  name: Go JSSI
  label: jssi_go
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Runtime
metadata:
  name: TinyGo JSSI
  label: jssi_tinygo
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Capability
metadata:
  name: Binding aliases
  label: bind_alias
spec:
  privileged: true
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Capability
metadata:
  name: Connecting to aliases
  label: connect_to_alias
spec:
  privileged: false
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Processor
metadata:
  name: Felix's iPhone
  label: felixs_iphone
spec:
  runtimes:
  - wasi_generic
  - wasi_tinygo
  - jssi_go
  - jssi_tinygo
  capabilities:
  - bind_alias
  - connect_to_alias
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: StunServer
metadata:
  name: Google STUN Server
  label: google
spec:
  urls:
  - stun:stun.l.google.com:19302
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: StunServer
metadata:
  name: Twillio STUN Server
  label: twillio
spec:
  urls:
  - stun:global.stun.twilio.com:3478?transport=udp
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: TurnServer
metadata:
  name: Twillio TURN Server
  label: twillio
spec:
  urls:
  - turn:global.turn.twilio.com:3478?transport=tcp
  username: f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be9c27212d
  credential: w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw=
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Signaler
metadata:
  name: Public unisockets Signaling Server
  label: unisockets_public
spec:
  urls:
  - wss://unisockets.herokuapp.com
  retryAfter: 1000
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Network
metadata:
  name: Public unisockets network
  label: unisockets_public
spec:
  signaler: unisockets_public
  stunServers:
  - google
  - twillio
  turnServers:
  - twillio
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Subnet
metadata:
  name: Echo Network
  label: echo_network
spec:
  network: unisockets_public
  prefix: 127.0.0
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Tracker
metadata:
  name: OpenWebTorrent
  label: openwebtorrent
spec:
  urls:
  - wss://tracker.openwebtorrent.com
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Tracker
metadata:
  name: Fastcast
  label: fastcast
spec:
  urls:
  - wss://tracker.fastcast.nz
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Repository
metadata:
  name: Public WebTorrent
  label: webtorrent_public
spec:
  trackers:
  - openwebtorrent
  - fastcast
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: File
metadata:
  name: C Echo Server Binary
  label: c_echo_server
spec:
  repository: webtorrent_public
  uri: magnet:?xt=urn:btih:9c2a3309dedf5a934569a40b0a739fb85e05f3ef&dn=echo_server_c.wasm&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: File
metadata:
  name: TinyGo WASI Echo Server Binary
  label: tinygo_wasi_echo_server
spec:
  repository: webtorrent_public
  uri: magnet:?xt=urn:btih:a035f32c84233c3b8f465d7b4ba3a08b31fb8a55&dn=echo_server_wasi.wasm&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: File
metadata:
  name: TinyGo JSSI Echo Server Binary
  label: tinygo_jssi_echo_server
spec:
  repository: webtorrent_public
  uri: magnet:?xt=urn:btih:fbe657b4f98ecc59c7af09af955f2bcde337cd71&dn=echo_server_jssi.wasm&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: File
metadata:
  name: Go Echo Server Binary
  label: go_echo_server
spec:
  repository: webtorrent_public
  uri: magnet:?xt=urn:btih:f5a6d3714d888711b32b32a5afff7f2db27113d7&dn=echo_server.wasm&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Arguments
metadata:
  name: Echo Server Configuration
  label: echo_server
spec:
  argv:
  - "-laddr"
  - 127.0.0.1:1234
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Workload
metadata:
  name: Go Echo Server
  label: go_echo_server
spec:
  file: go_echo_server
  runtime: jssi_go
  capabilities:
  - bind_alias
  subnet: echo_network
  arguments: echo_server
`;

  const resourcesToDelete = `apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Subnet
metadata:
  label: echo_network
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Repository
metadata:
  label: webtorrent_public
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: File
metadata:
  label: go_echo_server
---
apiVersion: webnetes.felix.pojtinger.com/v1alpha1
kind: Workload
metadata:
  label: go_echo_server
`;

  (async () => {
    const weblet = new Weblet(async () => window.location.reload());

    await weblet.createResourcesFromYAML(resourcesToCreate);

    await new Promise((res) => setTimeout(res, 20000));

    await weblet.deleteResourcesFromYAML(resourcesToDelete);
  })();
}
