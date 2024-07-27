declare module "m3u8-parser" {
  type Manifest = {
    allowCache?: boolean;
    endList?: boolean;
    mediaSequence?: number;
    dateRanges?: any[];
    discontinuitySequence?: number;
    playlistType?: string;
    custom?: Record<any, any>;
    playlists?: {
      attributes?: Record<any, any>;
      Manifest?: Manifest;
    }[];
    mediaGroups?: {
      AUDIO?: {
        "GROUP-ID"?: {
          NAME?: {
            default?: boolean;
            autoselect?: boolean;
            language?: string;
            uri?: string;
            instreamId?: string;
            characteristics?: string;
            forced?: boolean;
          };
        };
      };
      VIDEO?: Record<any, any>;
      "CLOSED-CAPTIONS"?: Record<any, any>;
      SUBTITLES?: Record<any, any>;
    };
    dateTimeString?: string;
    dateTimeObject?: Date;
    targetDuration?: number;
    totalDuration?: number;
    discontinuityStarts?: number[];
    segments?: {
      title?: string;
      byterange?: {
        length?: number;
        offset?: number;
      };
      duration?: number;
      programDateTime?: number;
      attributes?: Record<any, any>;
      discontinuity?: number;
      uri?: string;
      timeline?: number;
      key?: {
        method?: string;
        uri?: string;
        iv?: string;
      };
      map?: {
        uri?: string;
        byterange?: {
          length?: number;
          offset?: number;
        };
      };
      "cue-out"?: string;
      "cue-out-cont"?: string;
      "cue-in"?: string;
      custom?: Record<any, any>;
    }[];
  };

  export class Parser {
    manifest: Manifest;

    constructor();

    push(chunk: string): void;

    end(): void;

    addParser(options: {
      expression: RegExp;
      customType: string;
      dataParser?: (line: string) => any;
      segment?: boolean;
    }): void;

    addTagMapper(options: {
      expression: RegExp;
      map: (line: string) => string;
    }): void;
  }
}
