// components/popup/GenericPopupDialog.tsx
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet } from 'react-native';

export interface GenericPopupDialogRef {
  show: () => void;
  dismiss: () => void;
}

interface GenericPopupDialogProps {
  children: React.ReactNode;
  width?: number;
  dialogStyle?: any;
  showMethod?: (visible: boolean) => void;
}

const GenericPopupDialog = forwardRef<GenericPopupDialogRef, GenericPopupDialogProps>(
  ({ children, width = 0.9, dialogStyle, showMethod }, ref) => {
    const [visible, setVisible] = useState(false);
    const screenWidth = Dimensions.get('window').width;

    useImperativeHandle(ref, () => ({
      show: () => {
        setVisible(true);
        showMethod?.(true);
      },
      dismiss: () => {
        setVisible(false);
        showMethod?.(false);
      },
    }));

    return (
      <Modal
        transparent={true}
        animationType="fade"
        visible={visible}
        onRequestClose={() => {
          setVisible(false);
          showMethod?.(false);
        }}
      >
        <Pressable 
          style={styles.overlay}
          onPress={() => {
            setVisible(false);
            showMethod?.(false);
          }}
        >
          <Pressable 
            style={[
              styles.dialog,
              { width: screenWidth * width },
              dialogStyle
            ]}
            onPress={() => {}} // Previene que se cierre al tocar el contenido
          >
            {children}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: '80%',
  },
});

export default GenericPopupDialog;