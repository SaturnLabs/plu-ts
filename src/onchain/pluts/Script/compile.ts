import { Buffer } from "buffer";
import Cbor from "../../../cbor/Cbor";
import CborBytes from "../../../cbor/CborObj/CborBytes";
import UPLCEncoder from "../../UPLC/UPLCEncoder";
import UPLCProgram from "../../UPLC/UPLCProgram";
import UPLCVersion from "../../UPLC/UPLCProgram/UPLCVersion";
import PType from "../PType";
import Term from "../Term";

const defaultVersion: [ number, number, number ] = [ 1, 0, 0 ];

function getValidVersion( version: Readonly<[number, number, number]> ): [number, number, number]
{
    const v = !Array.isArray( version ) || (version as any).length === 0 ? defaultVersion : version;
    return ([0,1,2].map( i => Math.abs( Math.round( v[i] ?? 0 ) ) )) as any;
}

export default function compile( term: Term<PType>, version: Readonly<[number, number, number]> = defaultVersion ): Buffer
{
    const v = getValidVersion( version );

    return UPLCEncoder.compile(
        new UPLCProgram(
            new UPLCVersion( v[0], v[1], v[2] ),
            term.toUPLC( 0 )
        )
    ).toBuffer().buffer;
}

export const enum PlutusScriptVersion {
    V1 = "PlutusScriptV1",
    V2 = "PlutusScriptV2"
};

export interface ScriptJsonFormat {
    type: PlutusScriptVersion,
    description: string,
    cborHex: string
}

export function scriptToJsonFormat( compiledScript: Buffer, plutusScriptVersion: PlutusScriptVersion, description: string = "" ): ScriptJsonFormat
{
    return {
        type: plutusScriptVersion,
        description: description,
        cborHex: Cbor.encode(
            new CborBytes(
                Cbor.encode(
                    new CborBytes(
                        compiledScript
                    )
                ).asBytes
            )
        ).asString
    }
}