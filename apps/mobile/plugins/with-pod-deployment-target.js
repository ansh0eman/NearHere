const { withPodfile } = require('@expo/config-plugins');

const marker = '# NearHere: align generated Pods with the app deployment target.';

/**
 * Xcode 27 rejects third-party Pods that retain an iOS target below 15. The
 * application target is iOS 15.1; make generated Pods use that same floor.
 *
 * Native `ios/` is generated in this Expo project, so this config plugin is
 * the source of truth rather than a one-off Podfile edit.
 */
function withPodDeploymentTarget(config) {
  return withPodfile(config, (podfileConfig) => {
    if (podfileConfig.modResults.contents.includes(marker)) {
      return podfileConfig;
    }

    const override = `
    ${marker}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
    end
`;

    const closingPostInstall = /\n  end\nend\s*$/;
    if (!closingPostInstall.test(podfileConfig.modResults.contents)) {
      throw new Error('NearHere could not locate the Podfile post_install block.');
    }

    podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
      closingPostInstall,
      `${override}\n  end\nend\n`,
    );
    return podfileConfig;
  });
}

module.exports = withPodDeploymentTarget;
