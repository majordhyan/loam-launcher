import java.io.File;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import com.mojang.serialization.JsonOps;
import net.minecraft.SharedConstants;
import net.minecraft.server.Bootstrap;
import net.minecraft.server.packs.metadata.pack.PackFormat;
import net.minecraft.server.packs.metadata.pack.PackMetadataSection;
import net.minecraft.server.packs.repository.PackCompatibility;
import net.minecraft.server.packs.PackType;

public class TestPack {
    public static void main(String[] args) {
        SharedConstants.tryDetectVersion();
        Bootstrap.bootStrap();
        
        var currentPackVersion = SharedConstants.getCurrentVersion().packVersion(PackType.CLIENT_RESOURCES);
        System.out.println("CURRENT RESOURCE PACK VERSION: " + currentPackVersion);
        
        String[] samples = {
            "{\"description\":\"LOAM Custom Appearance\",\"pack_format\":97,\"supported_formats\":[1,999],\"min_format\":1,\"max_format\":999}",
            "{\"description\":\"LOAM Custom Appearance\",\"pack_format\":97,\"min_format\":[97,1],\"max_format\":[97,1]}",
            "{\"description\":\"LOAM Custom Appearance\",\"pack_format\":97,\"min_format\":97,\"max_format\":97}",
            "{\"description\":\"LOAM Custom Appearance\",\"pack_format\":97,\"supported_formats\":[46,97],\"min_format\":46,\"max_format\":97}"
        };
        for (String s : samples) {
            try {
                JsonElement json = JsonParser.parseString(s);
                var result = PackMetadataSection.forPackType(PackType.CLIENT_RESOURCES).codec().parse(JsonOps.INSTANCE, json);
                var section = result.getOrThrow();
                var compat = PackCompatibility.forVersion(section.supportedFormats(), currentPackVersion);
                System.out.println("\nTEST: " + s);
                System.out.println("RESULT: " + result);
                System.out.println("COMPAT: " + compat + " (isCompatible: " + compat.isCompatible() + ")");
            } catch (Exception e) {
                System.out.println("\nTEST: " + s);
                System.out.println("EXC: " + e.getMessage());
            }
        }
    }
}
