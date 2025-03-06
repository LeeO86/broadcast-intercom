declare module 'janode' {
  export default class Janode {
    static connect(options: any): Promise<any>;
    static EVENT: {
      CONNECTION_CLOSED: string;
      CONNECTION_ERROR: string;
      SESSION_DESTROYED: string;
    };
  }
}

declare module 'janode/plugins/audiobridge' {
  export default class AudioBridgePlugin {
    attach(options?: any): Promise<any>;
    create(options: any): Promise<any>;
    destroy(options: any): Promise<any>;
    join(options: any): Promise<any>;
    leave(): Promise<any>;
    list(): Promise<any>;
    detach(): Promise<any>;
    configure(options: any): Promise<any>;
    trickle(candidate: any): Promise<any>;
    trickleComplete(): Promise<any>;
  }
}